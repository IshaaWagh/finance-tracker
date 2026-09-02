import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { Transaction } from "@/lib/finance-types";
import { groupByMonth } from "@/lib/forecast";

const PIE_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
  "#a78bfa",
  "#f472b6",
  "#38bdf8",
  "#facc15",
];

interface ExpenseChartsProps {
  transactions: Transaction[];
  formatAmount: (n: number) => string;
}

export function ExpenseCharts({ transactions, formatAmount }: ExpenseChartsProps) {
  const categoryData = useMemo(() => {
    const totals = new Map<string, number>();
    for (const t of transactions) {
      if (t.type !== "expense") continue;
      totals.set(t.category, (totals.get(t.category) ?? 0) + t.amount);
    }
    return Array.from(totals.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  const monthlyData = useMemo(() => groupByMonth(transactions), [transactions]);

  if (transactions.length === 0) {
    return (
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-card-foreground">Analytics</h2>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Add a few transactions to see charts here.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold text-card-foreground">Analytics</h2>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-medium text-muted-foreground">Expenses by Category</p>
          {categoryData.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No expenses yet</p>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                    animationDuration={500}
                    isAnimationActive
                  >
                    {categoryData.map((entry, i) => (
                      <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatAmount(value)} />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    wrapperStyle={{ fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-muted-foreground">
            Income vs Expense (Cash Flow)
          </p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: number) => formatAmount(value)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="income"
                  stroke="var(--color-income)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  animationDuration={500}
                />
                <Line
                  type="monotone"
                  dataKey="expense"
                  stroke="var(--color-expense)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  animationDuration={500}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-2">
          <p className="mb-2 text-sm font-medium text-muted-foreground">Monthly Comparison</p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: number) => formatAmount(value)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  dataKey="income"
                  fill="var(--color-income)"
                  radius={[4, 4, 0, 0]}
                  animationDuration={500}
                />
                <Bar
                  dataKey="expense"
                  fill="var(--color-expense)"
                  radius={[4, 4, 0, 0]}
                  animationDuration={500}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}
