import { Transaction } from "./finance-types";

export interface MonthlyPoint {
  /** e.g. "2026-05" */
  key: string;
  label: string; // e.g. "May 2026"
  income: number;
  expense: number;
  net: number;
}

export interface ForecastPoint {
  key: string;
  label: string;
  /** Historical actual net cash flow. Undefined for future months. */
  actual?: number | undefined;
  /** Projected net cash flow. Undefined for historical months. */
  forecast?: number | undefined;
}

/** Buckets all transactions into calendar months, sorted ascending. */
export function groupByMonth(transactions: Transaction[]): MonthlyPoint[] {
  const buckets = new Map<string, MonthlyPoint>();

  for (const t of transactions) {
    const d = new Date(t.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });

    if (!buckets.has(key)) {
      buckets.set(key, { key, label, income: 0, expense: 0, net: 0 });
    }
    const bucket = buckets.get(key)!;
    if (t.type === "income") bucket.income += t.amount;
    else bucket.expense += t.amount;
    bucket.net = bucket.income - bucket.expense;
  }

  return Array.from(buckets.values()).sort((a, b) => a.key.localeCompare(b.key));
}

/** Simple ordinary-least-squares linear regression y = slope*x + intercept. */
export function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  if (n === 1) return { slope: 0, intercept: values[0] ?? 0 };

  const xs = values.map((_, i) => i);
  const xMean = xs.reduce((a, b) => a + b, 0) / n;
  const yMean = values.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    const x = xs[i] ?? 0;
    const y = values[i] ?? 0;
    num += (x - xMean) * (y - yMean);
    den += (x - xMean) ** 2;
  }

  const slope = den === 0 ? 0 : num / den;
  const intercept = yMean - slope * xMean;
  return { slope, intercept };
}

/** Single exponential smoothing; returns the smoothed series and next-step forecast. */
export function exponentialSmoothing(values: number[], alpha = 0.4): number[] {
  if (values.length === 0) return [];
  const smoothed: number[] = [values[0] ?? 0];
  for (let i = 1; i < values.length; i++) {
    const value = values[i] ?? 0;
    const prev = smoothed[i - 1] ?? 0;
    smoothed.push(alpha * value + (1 - alpha) * prev);
  }
  return smoothed;
}

export interface WhatIfAdjustment {
  /** e.g. "Rent increase" */
  label: string;
  /** Flat monthly amount added (positive) or removed (negative) from expenses */
  monthlyExpenseDelta: number;
}

/**
 * Projects the next `months` months of net cash flow using a blend of
 * linear-regression trend and exponential smoothing of recent history,
 * then applies any what-if adjustments to the expense side.
 */
export function projectCashFlow(
  monthly: MonthlyPoint[],
  months: number,
  adjustments: WhatIfAdjustment[] = [],
): ForecastPoint[] {
  const totalDelta = adjustments.reduce((sum, a) => sum + a.monthlyExpenseDelta, 0);

  const historical: ForecastPoint[] = monthly.map((m) => ({
    key: m.key,
    label: m.label,
    actual: m.net,
  }));

  if (monthly.length === 0) {
    return historical;
  }

  const netSeries = monthly.map((m) => m.net);
  const { slope, intercept } = linearRegression(netSeries);
  const smoothed = exponentialSmoothing(netSeries);
  const lastSmoothed = smoothed[smoothed.length - 1] ?? 0;

  const future: ForecastPoint[] = [];
  const lastMonth = monthly[monthly.length - 1]!;
  const lastDate = new Date(`${lastMonth.key}-01T00:00:00`);

  for (let i = 1; i <= months; i++) {
    const x = netSeries.length - 1 + i;
    const trendValue = slope * x + intercept;
    // Blend trend projection with the last smoothed level (60/40) for stability.
    const blended = trendValue * 0.6 + lastSmoothed * 0.4;
    const adjusted = blended - totalDelta;

    const d = new Date(lastDate);
    d.setMonth(d.getMonth() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });

    future.push({ key, label, forecast: adjusted });
  }

  // Bridge point: repeat the last actual as the start of the forecast line
  // so the chart's two series connect visually.
  const lastHistorical = historical[historical.length - 1]!;
  const bridge: ForecastPoint = {
    key: lastHistorical.key,
    label: lastHistorical.label,
    actual: lastHistorical.actual,
    forecast: lastHistorical.actual,
  };

  return [...historical.slice(0, -1), bridge, ...future];
}

export function projectedSavings(forecast: ForecastPoint[]): number {
  return forecast
    .filter((f) => f.forecast !== undefined)
    .reduce((sum, f) => sum + (f.forecast ?? 0), 0);
}
