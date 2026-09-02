import { CurrencyCode } from "./finance-types";

const RATES_CACHE_KEY = "finance-tracker-exchange-rates";
const RATES_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const CURRENCY_PREF_KEY = "finance-tracker-currency";

// Base currency for all stored amounts is INR.
const BASE_CURRENCY = "INR";

interface RatesCache {
  base: string;
  rates: Record<string, number>;
  fetchedAt: number;
}

// Fallback static rates (approximate) used if the live API is unreachable,
// so the currency switcher still works offline / on first load failure.
const FALLBACK_RATES: Record<string, number> = {
  INR: 1,
  USD: 0.012,
  EUR: 0.011,
  GBP: 0.0095,
};

function readCache(): RatesCache | null {
  try {
    const raw = localStorage.getItem(RATES_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RatesCache;
    if (Date.now() - parsed.fetchedAt > RATES_CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(cache: RatesCache) {
  try {
    localStorage.setItem(RATES_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore quota errors
  }
}

/**
 * Fetches live exchange rates (base = INR) from a free, keyless API,
 * caching the result in localStorage for RATES_CACHE_TTL_MS.
 * Falls back to static approximate rates if the request fails.
 */
export async function getExchangeRates(): Promise<Record<string, number>> {
  const cached = readCache();
  if (cached) return cached.rates;

  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${BASE_CURRENCY}`);
    if (!res.ok) throw new Error(`Rate request failed: ${res.status}`);
    const data = await res.json();
    if (data?.result !== "success" || !data?.rates) {
      throw new Error("Unexpected rate API response");
    }
    const rates: Record<string, number> = data.rates;
    writeCache({ base: BASE_CURRENCY, rates, fetchedAt: Date.now() });
    return rates;
  } catch {
    return FALLBACK_RATES;
  }
}

/** Converts an amount stored in the base currency (INR) into `to`. */
export function convertFromBase(
  amountInBase: number,
  to: CurrencyCode,
  rates: Record<string, number>,
): number {
  const rate = rates[to] ?? FALLBACK_RATES[to] ?? 1;
  return amountInBase * rate;
}

export function getStoredCurrency(): CurrencyCode {
  try {
    const stored = localStorage.getItem(CURRENCY_PREF_KEY);
    if (stored && ["INR", "USD", "EUR", "GBP"].includes(stored)) {
      return stored as CurrencyCode;
    }
  } catch {
    // ignore
  }
  return "INR";
}

export function setStoredCurrency(currency: CurrencyCode) {
  try {
    localStorage.setItem(CURRENCY_PREF_KEY, currency);
  } catch {
    // ignore
  }
}
