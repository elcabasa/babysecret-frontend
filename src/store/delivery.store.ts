"use client";

import { create } from "zustand";
import type { DeliveryQuote } from "@/types/shipping";

export type DeliveryStatus =
  "idle" | "loading" | "ready" | "error" | "unavailable";

type DeliveryState = {
  quotes: DeliveryQuote[];
  selectedRateId: string | null;
  status: DeliveryStatus;
  error: string;
  setStatus: (status: DeliveryStatus) => void;
  setQuotes: (quotes: DeliveryQuote[]) => void;
  selectRate: (rateId: string | null) => void;
  setError: (error: string) => void;
  reset: () => void;
};

export const useDeliveryStore = create<DeliveryState>()((set) => ({
  quotes: [],
  selectedRateId: null,
  status: "idle",
  error: "",
  setStatus: (status) => set({ status }),
  setQuotes: (quotes) =>
    set({
      quotes,
      selectedRateId: quotes.length ? quotes[0].rateId : null,
      status: quotes.length ? "ready" : "unavailable",
      error: "",
    }),
  selectRate: (rateId) => set({ selectedRateId: rateId }),
  setError: (error) => set({ error, status: "error", quotes: [] }),
  reset: () =>
    set({ quotes: [], selectedRateId: null, status: "idle", error: "" }),
}));

export const selectSelectedQuote = (state: DeliveryState) =>
  state.quotes.find((quote) => quote.rateId === state.selectedRateId) ?? null;
