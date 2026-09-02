import { useMemo, useState } from "react";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Slider } from "@/components/ui/slider";
import { Transaction } from "@/lib/finance-types";
import { groupByMonth, projectCashFlow, projectedSavings, WhatIfAdjustment } from "@/lib/forecast";

interface ForecastSimulatorProps {
  transactions: Transaction[];
  formatAmount: (n: number) => string;
}

const HORIZONS = [3, 6, 12] as const;

export function ForecastSimulator({ transactions, formatAmount }: ForecastSimulatorProps) {
  const [horizon, setHorizon] = useState<(typeof HORIZONS)[number]>(6);
  const [rentChangePct, setRentChangePct] = useState(0); // -50 to +50
  const [diningCut, setDiningCut] = useState(0); // 0 to 500 (base currency units, scaled below)
  const [extraSavings, setExtraSavings] = useState(0); // additional monthly savings goal

  const monthly = useMemo(() => groupByMonth(transactions), [transactions]);

  // Estimate current average monthly rent-like spend to scale the % slider.
  const avgHousingSpend = useMemo(() => {
    const housing = transactions.filter((t) => t.type === "expense" && t.category === "Housing");
    if (housing.length === 0) return 0;
    const total = housing.reduce((sum, t) => sum + t.amount, 0);
    const months = Math.max(monthly.length, 1);
    return total / months;
  }, [transactions, monthly.length]);

  const adjustments: WhatIfAdjustment[] = useMemo(() => {
    const list: WhatIfAdjustment[] = [];
    if (rentChangePct !== 0) {
      list.push({
        label: "Rent change",
        monthlyExpenseDelta: avgHousingSpend * (rentChangePct / 100),
      });
    }
    if (diningCut !== 0) {
      list.push({ label: "Dining cut", monthlyExpenseDelta: -diningCut });
    }
    if (extraSavings !== 0) {
      list.push({ label: "Extra savings goal", monthlyExpenseDelta: extraSavings });
    }
    return list;
  }, [rentChangePct, diningCut, extraSavings, avgHousingSpend]);

  const forecast = useMemo(
    () => projectCashFlow(monthly, horizon, adjustments),
    [monthly, horizon, adjustments],
  );

  const projected = useMemo(() => projectedSavings(forecast), [forecast]);
  const baseline = useMemo(
    () => projectedSavings(projectCashFlow(monthly, horizon, [])),
    [monthly, horizon],
  );

  const hasEnoughData = monthly.length >= 2;

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-card-foreground">
          Cash Flow Forecast & What-If Simulator
        </h2>
        <div className="flex overflow-hidden rounded-lg border border-border">
          {HORIZONS.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => setHorizon(h)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                horizon === h
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-accent"
              }`}
            >
              {h}mo
            </button>
          ))}
        </div>
      </div>

      {!hasEnoughData ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Add transactions across at least 2 different months to unlock forecasting.
        </p>
      ) : (
        <>
          <div className="mt-6 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={forecast} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: number) => formatAmount(value)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="actual"
                  name="Actual net"
                  stroke="var(--color-chart-1)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                  isAnimationActive
                  animationDuration={300}
                />
                <Line
                  type="monotone"
                  dataKey="forecast"
                  name="Forecast net"
                  stroke="var(--color-chart-3)"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={{ r: 3 }}
                  connectNulls
                  isAnimationActive
                  animationDuration={300}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div>
              <div className="flex items-center justify-between text-sm">
                <label className="font-medium text-foreground">Rent change</label>
                <span className="text-muted-foreground">
                  {rentChangePct > 0 ? "+" : ""}
                  {rentChangePct}%
                </span>
              </div>
              <Slider
                className="mt-3"
                min={-50}
                max={50}
                step={5}
                value={[rentChangePct]}
                onValueChange={(v) => setRentChangePct(v[0] ?? 0)}
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-sm">
                <label className="font-medium text-foreground">Cut dining out</label>
                <span className="text-muted-foreground">{formatAmount(diningCut)}/mo</span>
              </div>
              <Slider
                className="mt-3"
                min={0}
                max={500}
                step={25}
                value={[diningCut]}
                onValueChange={(v) => setDiningCut(v[0] ?? 0)}
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-sm">
                <label className="font-medium text-foreground">Extra monthly savings</label>
                <span className="text-muted-foreground">{formatAmount(extraSavings)}/mo</span>
              </div>
              <Slider
                className="mt-3"
                min={0}
                max={1000}
                step={50}
                value={[extraSavings]}
                onValueChange={(v) => setExtraSavings(v[0] ?? 0)}
              />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-xs font-medium text-muted-foreground">
                Baseline projected net ({horizon}mo)
              </p>
              <p className="mt-1 text-xl font-bold text-foreground">{formatAmount(baseline)}</p>
            </div>
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-xs font-medium text-muted-foreground">With scenario applied</p>
              <p
                className={`mt-1 text-xl font-bold ${
                  projected >= baseline ? "text-income" : "text-expense"
                }`}
              >
                {formatAmount(projected)}
              </p>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
