import { useEffect, useState } from "react";
import { CurrencyCode, SUPPORTED_CURRENCIES } from "@/lib/finance-types";
import { getExchangeRates, getStoredCurrency, setStoredCurrency } from "@/lib/currency";

interface CurrencySwitcherProps {
  currency: CurrencyCode;
  onChange: (currency: CurrencyCode, rates: Record<string, number>) => void;
}

export function CurrencySwitcher({ currency, onChange }: CurrencySwitcherProps) {
  const [loading, setLoading] = useState(false);
  const [rates, setRates] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getExchangeRates()
      .then((r) => {
        if (cancelled) return;
        setRates(r);
        onChange(getStoredCurrency(), r);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSelect(next: CurrencyCode) {
    setStoredCurrency(next);
    if (rates) onChange(next, rates);
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">Currency</span>
      <div className="flex overflow-hidden rounded-lg border border-border">
        {SUPPORTED_CURRENCIES.map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => handleSelect(code)}
            disabled={loading}
            className={`px-2.5 py-1 text-xs font-semibold transition-colors ${
              currency === code
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:bg-accent"
            }`}
          >
            {code}
          </button>
        ))}
      </div>
      {loading && <span className="text-xs text-muted-foreground">syncing…</span>}
    </div>
  );
}
