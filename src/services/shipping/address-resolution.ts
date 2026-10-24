/**
 * Terminal Africa destination-address resolution.
 *
 * Background
 * ----------
 * The checkout collects Nigerian state/LGA values from the store's own
 * locations plugin, but Terminal Africa only quotes for its own canonical
 * city list (see `GET /cities`). Sending a raw LGA such as "Eti-Osa" makes
 * Terminal reject the whole quote request with
 * "Invalid city, please select one from the list of cities" — while the
 * Terminal dashboard (which uses Terminal's own city dropdown) quotes the
 * same area without trouble.
 *
 * Strategy (no hardcoded coverage lists, no guessing)
 * ---------------------------------------------------
 * 1. Pull the canonical state/city data from Terminal itself (`/states` and
 *    `/cities`), cached in memory with a TTL.
 * 2. Match the customer's state/city against that data with normalization
 *    only (case/punctuation-insensitive). An exact normalized match adopts
 *    Terminal's canonical spelling; anything else keeps the customer's
 *    value so we never silently move the parcel to a different location.
 * 3. Run the resolved destination through Terminal's `/addresses/validate`.
 *    Postal/casing corrections for the SAME city+state are adopted;
 *    suggestions pointing at a different city/state are logged and ignored.
 * 4. Rewrap address lines to Terminal's 45-character line1 limit instead of
 *    failing the request (layout change only — never a location change).
 *
 * If validation is unreachable or inconclusive, resolution fails OPEN to the
 * quote attempt: a bad address yields no rates (friendly fallback), never a
 * customer-facing technical error.
 */

const MAX_LINE1_CHARS = 45;

export interface ResolvedDestination {
  /** Address to send to Terminal (canonical city, validated zip, wrapped lines). */
  address: {
    city: string;
    state: string;
    country: string;
    line1: string;
    line2: string;
    zip: string;
  };
  diagnostics: {
    submittedCity: string;
    submittedState: string;
    submittedPostalCode: string;
    submittedAddress: string;
    resolvedCity: string;
    resolvedState: string;
    cityMatchedTerminalList: boolean;
    validationSucceeded: boolean;
    validationNotes: string[];
    suggestionAdopted: boolean;
    linesRewrapped: boolean;
  };
}

interface TerminalCity {
  name: string;
  stateCode: string;
}

interface TerminalState {
  name: string;
  isoCode: string;
}

interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const statesCache = new Map<string, CacheEntry<TerminalState[]>>();
const citiesCache = new Map<string, CacheEntry<TerminalCity[]>>();

function terminalConfig(): { apiBase: string; apiKey: string } {
  const apiBase =
    process.env.TERMINAL_API_BASE ?? "https://api.terminal.africa/v1";
  const apiKey = process.env.TERMINAL_API_KEY ?? "";

  if (!apiKey) {
    throw new Error("Terminal Africa API key is not configured.");
  }

  return { apiBase: apiBase.replace(/\/$/, ""), apiKey };
}

async function terminalGet(path: string): Promise<{
  http: number;
  body: unknown;
}> {
  const { apiBase, apiKey } = terminalConfig();
  const response = await fetch(`${apiBase}${path}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  let body: unknown = null;

  try {
    body = (await response.json()) as unknown;
  } catch {
    body = null;
  }

  return { http: response.status, body };
}

async function terminalPost(
  path: string,
  payload: Record<string, unknown>,
): Promise<{ http: number; body: unknown }> {
  const { apiBase, apiKey } = terminalConfig();
  const response = await fetch(`${apiBase}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  let body: unknown = null;

  try {
    body = (await response.json()) as unknown;
  } catch {
    body = null;
  }

  return { http: response.status, body };
}

/** Lowercase alphanumeric comparison: "Eti-Osa" ~ "Eti Osa" ~ "etiosa". */
export function normalizePlaceName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * True for Nigeria in either ISO-code ("NG") or full-name ("Nigeria") form.
 * Checkout collects free-text countries, so both spellings must be accepted.
 */
export function isNigeriaCountry(value: string): boolean {
  const trimmed = (value ?? "").trim().toLowerCase();
  return trimmed === "nigeria" || trimmed === "ng";
}

const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  nigeria: "NG",
  "united states": "US",
  "united kingdom": "GB",
  ghana: "GH",
  kenya: "KE",
  "south africa": "ZA",
};

/**
 * Normalizes a free-text country to the ISO code Terminal expects.
 * Two-letter input passes through uppercased; known names map to codes.
 */
export function terminalCountryCode(country: string): string {
  const trimmed = (country ?? "").trim();
  if (/^[A-Za-z]{2}$/.test(trimmed)) return trimmed.toUpperCase();
  return COUNTRY_NAME_TO_CODE[trimmed.toLowerCase()] ?? trimmed.toUpperCase();
}

/**
 * Lists Terminal Africa's canonical cities for a state, preserving Terminal's
 * own spelling/casing. Backed by the same 24h in-memory cache as quote-time
 * resolution, so the checkout dropdown and the quote request always agree.
 *
 * Returns an empty city list (not a throw) when the state itself is unknown
 * to Terminal. Throws only when Terminal is unreachable/misconfigured —
 * callers convert that into a friendly, provider-anonymous message.
 */
export async function listTerminalCities(
  country: string,
  stateName: string,
): Promise<{ state: string; cities: string[] }> {
  const countryCode = terminalCountryCode(country) || "NG";
  const states = await getTerminalStates(countryCode);
  // Alias-aware: "FCT" / "Federal Capital Territory" resolve to Terminal's
  // real "Abuja" record; the stateCode below is always Terminal's own.
  const stateMatch = matchTerminalState(states, stateName);

  if (!stateMatch) return { state: (stateName ?? "").trim(), cities: [] };

  const cities = await getTerminalCities(countryCode, stateMatch.isoCode);

  return { state: stateMatch.name, cities: cities.map((city) => city.name) };
}

export type NigeriaCityCheck =
  | { status: "supported"; state: string; city: string }
  | { status: "unsupported" }
  | { status: "lookup-failed" };

/**
 * Strict canonical-city check for Nigerian delivery destinations.
 *
 * "supported" carries Terminal's canonical state/city spelling. "unsupported"
 * means Terminal has no such city for the state (e.g. an LGA like "Eti-Osa"
 * sent as the city) — callers must ask for a listed City / Delivery Area
 * instead of quoting. "lookup-failed" means Terminal itself could not be
 * reached, in which case callers fail OPEN to the normal quote attempt (no
 * rates → friendly fallback) rather than blocking checkout on our side.
 */
export async function checkNigeriaTerminalCity(
  state: string,
  city: string,
): Promise<NigeriaCityCheck> {
  try {
    const { state: canonicalState, cities } = await listTerminalCities(
      "NG",
      state,
    );
    const match = matchTerminalPlace(
      cities.map((name) => ({ name })),
      city,
    );

    if (match) {
      return {
        status: "supported",
        state: canonicalState,
        city: match.name,
      };
    }

    return { status: "unsupported" };
  } catch {
    return { status: "lookup-failed" };
  }
}

function readCache<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null {
  const entry = cache.get(key);

  if (!entry || entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }

  return entry.value;
}

function writeCache<T>(cache: Map<string, CacheEntry<T>>, key: string, value: T): void {
  cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, value });
}

async function getTerminalStates(countryCode: string): Promise<TerminalState[]> {
  const cached = readCache(statesCache, countryCode);

  if (cached) return cached;

  const { http, body } = await terminalGet(
    `/states?country_code=${encodeURIComponent(countryCode)}`,
  );

  if (http < 200 || http >= 300 || !Array.isArray((body as { data?: unknown })?.data)) {
    throw new Error(`Terminal states lookup failed (HTTP ${http}).`);
  }

  const states = ((body as { data: unknown[] }).data ?? [])
    .map((entry) => {
      const record = entry as { name?: unknown; isoCode?: unknown };
      return {
        name: typeof record.name === "string" ? record.name : "",
        isoCode: typeof record.isoCode === "string" ? record.isoCode : "",
      };
    })
    .filter((state) => state.name && state.isoCode);

  writeCache(statesCache, countryCode, states);

  return states;
}

async function getTerminalCities(
  countryCode: string,
  stateCode: string,
): Promise<TerminalCity[]> {
  const key = `${countryCode}:${stateCode}`;
  const cached = readCache(citiesCache, key);

  if (cached) return cached;

  const { http, body } = await terminalGet(
    `/cities?country_code=${encodeURIComponent(countryCode)}&state_code=${encodeURIComponent(stateCode)}`,
  );

  if (http < 200 || http >= 300 || !Array.isArray((body as { data?: unknown })?.data)) {
    throw new Error(`Terminal cities lookup failed (HTTP ${http}).`);
  }

  const cities = ((body as { data: unknown[] }).data ?? [])
    .map((entry) => {
      const record = entry as { name?: unknown; stateCode?: unknown };
      return {
        name: typeof record.name === "string" ? record.name : "",
        stateCode: typeof record.stateCode === "string" ? record.stateCode : "",
      };
    })
    .filter((city) => city.name);

  writeCache(citiesCache, key, cities);

  return cities;
}

/**
 * Matches a free-text place against Terminal records by normalized name.
 * Returns the canonical record, or null when Terminal has no such place.
 */
function matchTerminalPlace<T extends { name: string }>(
  records: T[],
  value: string,
): T | null {
  const wanted = normalizePlaceName(value);

  if (!wanted) return null;

  return records.find((record) => normalizePlaceName(record.name) === wanted) ?? null;
}

/**
 * Known state-name variants, keyed by the NORMALIZED name of Terminal's own
 * state record. Verified live against `GET /states?country_code=NG`:
 * Terminal calls the capital "Abuja" (isoCode "FC") while the store's
 * Nigerian locations dataset calls it "FCT".
 *
 * Aliases only ever resolve TO a real Terminal record — the state's code and
 * its cities still come from Terminal itself, so nothing is invented. Add a
 * new entry only after verifying the record in a live Terminal response.
 */
const STATE_NAME_ALIASES: Record<string, string[]> = {
  abuja: ["fct", "federalcapitalterritory", "federalcapital", "abujafct"],
};

/**
 * Matches a customer-selected state against Terminal's state records.
 * Exact normalized matches win; otherwise a verified alias (e.g. "FCT" →
 * Terminal's "Abuja" record) resolves to that same real record. Returns null
 * only when Terminal genuinely has no such state.
 */
function matchTerminalState<T extends { name: string }>(
  records: T[],
  value: string,
): T | null {
  const direct = matchTerminalPlace(records, value);

  if (direct) return direct;

  const wanted = normalizePlaceName(value);

  if (!wanted) return null;

  for (const [canonical, aliases] of Object.entries(STATE_NAME_ALIASES)) {
    if (canonical === wanted || aliases.includes(wanted)) {
      const record =
        records.find(
          (entry) => normalizePlaceName(entry.name) === canonical,
        ) ?? null;

      if (record) return record;
    }
  }

  return null;
}

/**
 * Rewraps an address so line1 fits Terminal's 45-character limit, moving
 * overflow words onto line2. This changes field layout, never location.
 */
export function wrapAddressLines(
  line1: string,
  line2: string,
  max: number = MAX_LINE1_CHARS,
): { line1: string; line2: string; rewrapped: boolean } {
  const first = (line1 ?? "").trim();
  const second = (line2 ?? "").trim();

  if (first.length <= max) return { line1: first, line2: second, rewrapped: false };

  let cut = first.lastIndexOf(" ", max);

  if (cut < 10) cut = max;

  const head = first.slice(0, cut).trim();
  const tail = first.slice(cut).trim();

  return {
    line1: head,
    line2: [tail, second].filter(Boolean).join(" "),
    rewrapped: true,
  };
}

type ValidationOutcome = {
  succeeded: boolean;
  notes: string[];
  suggestion: {
    line1?: string;
    city?: string;
    state?: string;
    zip?: string;
  } | null;
  /** Full canonical city list, present when Terminal rejects the city. */
  cityChoices: { name: string }[];
};

async function validateWithTerminal(payload: {
  city: string;
  state: string;
  country: string;
  line1: string;
  line2: string;
  zip: string;
}): Promise<ValidationOutcome> {
  const { http, body } = await terminalPost("/addresses/validate", payload);
  const data = (body as { data?: unknown } | null)?.data as {
    is_valid?: unknown;
    validation_messages?: { code?: unknown; message?: unknown }[];
    suggestion_provided?: unknown;
    suggested_address?: {
      line1?: unknown;
      city?: unknown;
      state?: unknown;
      zip?: unknown;
    };
  } | null;

  // A clean address validates with no detail payload.
  if (http >= 200 && http < 300 && data === null) {
    return { succeeded: true, notes: [], suggestion: null, cityChoices: [] };
  }

  if (http >= 200 && http < 300 && data && data.is_valid === true) {
    const notes = (data.validation_messages ?? [])
      .map((message) => String(message?.message ?? message?.code ?? ""))
      .filter(Boolean);

    const suggested = data.suggested_address && data.suggestion_provided
      ? {
        line1: typeof data.suggested_address.line1 === "string"
          ? data.suggested_address.line1
          : undefined,
        city: typeof data.suggested_address.city === "string"
          ? data.suggested_address.city
          : undefined,
        state: typeof data.suggested_address.state === "string"
          ? data.suggested_address.state
          : undefined,
        zip: typeof data.suggested_address.zip === "string"
          ? data.suggested_address.zip
          : undefined,
      }
      : null;

    return { succeeded: true, notes, suggestion: suggested, cityChoices: [] };
  }

  // An unknown city comes back as 400 with the valid city list attached —
  // return (not throw) so callers can retry the match against that list.
  if (http === 400) {
    const rawChoices = (body as { data?: unknown })?.data;

    if (Array.isArray(rawChoices)) {
      const cityChoices = rawChoices
        .map((entry) => {
          const record = entry as { name?: unknown };
          return typeof record.name === "string" ? { name: record.name } : null;
        })
        .filter((entry): entry is { name: string } => entry !== null);

      if (cityChoices.length) {
        return {
          succeeded: false,
          notes: ["Terminal reported an unknown city with its valid list"],
          suggestion: null,
          cityChoices,
        };
      }
    }
  }

  throw new Error(`Terminal address validation failed (HTTP ${http}).`);
}

/**
 * Resolves a customer destination to the address Terminal should quote.
 * Never throws for unresolvable places — callers fail open to the quote
 * attempt (no rates → friendly fallback). Throws only when Terminal itself
 * is unreachable/misconfigured, matching previous quote-error behavior.
 */
export async function resolveTerminalDestination(input: {
  city: string;
  state: string;
  country: string;
  line1: string;
  line2?: string;
  zip: string;
}): Promise<ResolvedDestination> {
  const submittedCity = (input.city ?? "").trim();
  const submittedState = (input.state ?? "").trim();
  const submittedPostalCode = (input.zip ?? "").trim();
  const submittedAddress = (input.line1 ?? "").trim();
  const country = terminalCountryCode(input.country) || "NG";

  const notes: string[] = [];
  let resolvedCity = submittedCity;
  let resolvedState = submittedState;
  let cityMatchedTerminalList = false;
  let validationSucceeded = false;
  let suggestionAdopted = false;

  // 1. Canonical city resolution from Terminal's own data.
  // State matching is alias-aware ("FCT" → Terminal's "Abuja" record);
  // city matching is exact-only so an LGA can never become a Terminal city.
  try {
    const states = await getTerminalStates(country);
    const stateMatch = matchTerminalState(states, submittedState);

    if (stateMatch) {
      resolvedState = stateMatch.name;
      const cities = await getTerminalCities(country, stateMatch.isoCode);
      const cityMatch = matchTerminalPlace(cities, submittedCity);

      if (cityMatch) {
        resolvedCity = cityMatch.name;
        cityMatchedTerminalList = true;
      } else {
        notes.push(
          `city "${submittedCity}" not in Terminal list for ${stateMatch.name}; keeping customer value`,
        );
      }
    } else {
      notes.push(
        `state "${submittedState}" not in Terminal list; keeping customer values`,
      );
    }
  } catch (error) {
    // Lookup failure must not block quoting — validation decides.
    notes.push(
      error instanceof Error ? error.message : "Terminal lookup failed.",
    );
  }

  // 2. Validate the resolved destination (zip is required by Terminal).
  let suggestion: ValidationOutcome["suggestion"] = null;

  try {
    const outcome = await validateWithTerminal({
      city: resolvedCity,
      state: resolvedState,
      country,
      line1: submittedAddress,
      line2: (input.line2 ?? "").trim(),
      zip: submittedPostalCode,
    });

    validationSucceeded = outcome.succeeded;
    notes.push(...outcome.notes);
    suggestion = outcome.suggestion;

    // Second-chance matching: an invalid-city 400 carries the valid list.
    if (!cityMatchedTerminalList && outcome.cityChoices.length) {
      const retry = matchTerminalPlace(outcome.cityChoices, submittedCity);

      if (retry) {
        resolvedCity = retry.name;
        cityMatchedTerminalList = true;
        notes.push(`city matched via validation city list: "${retry.name}"`);
      }
    }
  } catch (error) {
    notes.push(
      error instanceof Error ? error.message : "Terminal validation failed.",
    );
  }

  // 3. Adopt safe corrections only: same city + same state (postal/casing
  // fixes). A suggestion pointing elsewhere is logged and ignored.
  let line1 = submittedAddress;
  let zip = submittedPostalCode;

  if (
    suggestion &&
    normalizePlaceName(suggestion.city ?? resolvedCity) ===
      normalizePlaceName(resolvedCity) &&
    normalizePlaceName(suggestion.state ?? resolvedState) ===
      normalizePlaceName(resolvedState)
  ) {
    if (suggestion.line1 && suggestion.line1.trim() && suggestion.line1.trim() !== line1) {
      line1 = suggestion.line1.trim();
      suggestionAdopted = true;
    }

    if (suggestion.zip && suggestion.zip.trim() && suggestion.zip.trim() !== zip) {
      zip = suggestion.zip.trim();
      suggestionAdopted = true;
    }

    if (suggestion.city && suggestion.city !== resolvedCity) {
      resolvedCity = suggestion.city;
      suggestionAdopted = true;
    }
  } else if (suggestion) {
    notes.push("suggestion pointed at a different city/state; ignored");
  }

  // 4. Rewrap over-length lines to Terminal's limit (layout, not location).
  const wrapped = wrapAddressLines(line1, (input.line2 ?? "").trim());

  if (wrapped.rewrapped) {
    notes.push(`address lines rewrapped to ${MAX_LINE1_CHARS}-char limit`);
  }

  return {
    address: {
      city: resolvedCity,
      state: resolvedState,
      country,
      line1: wrapped.line1,
      line2: wrapped.line2,
      zip,
    },
    diagnostics: {
      submittedCity,
      submittedState,
      submittedPostalCode,
      submittedAddress,
      resolvedCity,
      resolvedState,
      cityMatchedTerminalList,
      validationSucceeded,
      validationNotes: notes,
      suggestionAdopted,
      linesRewrapped: wrapped.rewrapped,
    },
  };
}
