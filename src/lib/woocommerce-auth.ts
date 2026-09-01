import type { User } from "@/types/auth";

const restUrl =
  process.env.WOOCOMMERCE_REST_URL ?? "https://babysecret.com/wp-json/wc/v3";

const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY ?? "";
const consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET ?? "";

const storeApiUrl =
  process.env.NEXT_PUBLIC_WOOCOMMERCE_STORE_API_URL ??
  "https://babysecret.com/wp-json/wc/store/v1";

const wpRoot = storeApiUrl.replace(/\/wp-json\/wc\/store\/v1\/?$/, "");

function authHeader(): Record<string, string> {
  return {
    Authorization: `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64")}`,
    "Content-Type": "application/json",
  };
}

function formHeader(): Record<string, string> {
  return {
    Authorization: `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64")}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };
}

function appendForm(params: URLSearchParams, key: string, value: unknown) {
  if (value === undefined || value === null) return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => appendForm(params, `${key}[${index}]`, item));
  } else if (typeof value === "object") {
    for (const [subKey, subValue] of Object.entries(value)) {
      appendForm(params, `${key}[${subKey}]`, subValue);
    }
  } else {
    params.append(key, String(value));
  }
}

export function toFormBody(obj: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(obj)) {
    appendForm(params, key, value);
  }
  return params.toString();
}

type WooMetaData = { id?: number; key: string; value: unknown };

type WooCustomer = {
  id: number;
  email: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  meta_data?: WooMetaData[];
  billing?: {
    email?: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    address_1?: string;
    address_2?: string;
    city?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
  date_created?: string;
};

export type CreateCustomerInput = {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  authProvider?: "password" | "google";
  emailVerified?: boolean;
};

function metaValue(customer: WooCustomer, key: string): unknown {
  return customer.meta_data?.find((meta) => meta.key === key)?.value;
}

export function getCustomerMeta(customer: WooCustomer, key: string): string {
  const value = metaValue(customer, key);
  return value === undefined || value === null ? "" : String(value);
}

export function mapWooCustomer(customer: WooCustomer): User {
  const firstName = customer.first_name || customer.billing?.first_name || "";
  const lastName = customer.last_name || customer.billing?.last_name || "";

  const emailVerifiedMeta = getCustomerMeta(customer, "email_verified");

  return {
    id: String(customer.id),
    email: customer.email,
    name: `${firstName} ${lastName}`.trim() || customer.email,
    firstName,
    lastName,
    username: customer.username,
    role: customer.role === "administrator" ? "admin" : "customer",
    // Accounts created before email verification existed (no meta) or that
    // were explicitly verified are allowed to sign in. Only accounts that
    // are explicitly marked as unverified are required to verify.
    emailVerified: emailVerifiedMeta === "false" ? false : true,
    authProvider:
      (metaValue(customer, "auth_provider") as "password" | "google") ??
      "password",
    phone: customer.billing?.phone,
    billing: customer.billing
      ? {
          firstName: customer.billing.first_name,
          lastName: customer.billing.last_name,
          phone: customer.billing.phone,
          address: customer.billing.address_1,
          apartment: customer.billing.address_2,
          city: customer.billing.city,
          state: customer.billing.state,
          country: customer.billing.country,
          postcode: customer.billing.postcode,
        }
      : undefined,
  };
}

export async function getCustomerByEmail(
  email: string
): Promise<WooCustomer | null> {
  try {
    const response = await fetch(
      `${restUrl}/customers?email=${encodeURIComponent(email)}&per_page=1`,
      { headers: authHeader(), cache: "no-store" }
    );

    if (!response.ok) return null;

    const list = (await response.json()) as WooCustomer[];
    return Array.isArray(list) && list.length ? list[0] : null;
  } catch {
    return null;
  }
}

export async function getCustomerById(
  id: number | string
): Promise<WooCustomer | null> {
  try {
    const response = await fetch(`${restUrl}/customers/${id}`, {
      headers: authHeader(),
      cache: "no-store",
    });

    if (!response.ok) return null;
    return (await response.json()) as WooCustomer;
  } catch {
    return null;
  }
}

export type AuthErrorCode =
  | "INVALID_CREDENTIALS"
  | "AUTH_ENDPOINT_NOT_FOUND"
  | "AUTH_SERVER_ERROR"
  | "AUTH_SERVICE_ERROR"
  | "AUTH_NETWORK_ERROR"
  | "ACCOUNT_NOT_FOUND";

export class WooCommerceAuthError extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode, message: string) {
    super(message);
    this.name = "WooCommerceAuthError";
    this.code = code;
  }
}

export async function authenticateWooCommerce(
  email: string,
  password: string
): Promise<{ token: string; user: User }> {
  const tokenBody = new URLSearchParams({ username: email, password: password });

  let tokenResponse: Response;
  try {
    tokenResponse = await fetch(`${wpRoot}/wp-json/jwt-auth/v1/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenBody.toString(),
      cache: "no-store",
    });
  } catch (error) {
    console.error("[auth] jwt-auth network error:", error);
    throw new WooCommerceAuthError(
      "AUTH_NETWORK_ERROR",
      "We could not reach the store right now."
    );
  }

  let tokenData: { token?: string; code?: string; message?: string } = {};
  try {
    tokenData = await tokenResponse.json();
  } catch {
    tokenData = {};
  }

  if (!tokenResponse.ok) {
    console.error(
      `[auth] jwt-auth failed status=${tokenResponse.status} code=${tokenData.code ?? ""} message=${tokenData.message ?? ""}`
    );

    if (tokenResponse.status === 404) {
      throw new WooCommerceAuthError(
        "AUTH_ENDPOINT_NOT_FOUND",
        "The store sign-in service is not available."
      );
    }

    if (tokenResponse.status >= 500) {
      throw new WooCommerceAuthError(
        "AUTH_SERVER_ERROR",
        "The store sign-in service is not available."
      );
    }

    if (tokenResponse.status === 403) {
      throw new WooCommerceAuthError(
        "INVALID_CREDENTIALS",
        "Invalid email or password."
      );
    }

    throw new WooCommerceAuthError(
      "AUTH_SERVICE_ERROR",
      "We could not sign you in right now."
    );
  }

  if (!tokenData.token) {
    console.error(
      `[auth] jwt-auth returned no token body=${JSON.stringify(tokenData)}`
    );
    throw new WooCommerceAuthError(
      "AUTH_SERVICE_ERROR",
      "The store sign-in service is not available."
    );
  }

  const customer = await getCustomerByEmail(email);

  if (!customer) {
    throw new WooCommerceAuthError(
      "ACCOUNT_NOT_FOUND",
      "No account was found for this email."
    );
  }

  return { token: tokenData.token, user: mapWooCustomer(customer) };
}

export async function createWooCustomer(
  input: CreateCustomerInput
): Promise<User> {
  const body = toFormBody({
    email: input.email,
    username: input.email,
    password: input.password,
    first_name: input.firstName ?? "",
    last_name: input.lastName ?? "",
    billing: {
      email: input.email,
      first_name: input.firstName ?? "",
      last_name: input.lastName ?? "",
      phone: input.phone ?? "",
    },
    shipping: {
      first_name: input.firstName ?? "",
      last_name: input.lastName ?? "",
    },
    meta_data: [
      { key: "auth_provider", value: input.authProvider ?? "password" },
      { key: "email_verified", value: input.emailVerified ? "true" : "false" },
    ],
  });

  const response = await fetch(`${restUrl}/customers`, {
    method: "POST",
    headers: formHeader(),
    body,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message ?? "Could not create your account.");
  }

  return mapWooCustomer(data as WooCustomer);
}

export async function updateWooCustomer(
  id: number | string,
  fields: Record<string, unknown>
): Promise<User> {
  const response = await fetch(`${restUrl}/customers/${id}`, {
    method: "PUT",
    headers: formHeader(),
    body: toFormBody(fields),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message ?? "Could not update your account.");
  }

  return mapWooCustomer(data as WooCustomer);
}

export async function setWooCustomerPassword(
  id: number | string,
  password: string
): Promise<void> {
  await updateWooCustomer(id, { password });
}

export async function setEmailVerified(
  id: number | string,
  verified = true
): Promise<void> {
  await updateWooCustomer(id, {
    meta_data: [{ key: "email_verified", value: verified ? "true" : "false" }],
  });
}

export async function updateCustomerMeta(
  id: number | string,
  entries: { key: string; value: string | number | boolean }[]
): Promise<void> {
  await updateWooCustomer(id, {
    meta_data: entries.map((entry) => ({
      key: entry.key,
      value: String(entry.value),
    })),
  });
}
