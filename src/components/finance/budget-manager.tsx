import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Settings2 } from "lucide-react";
import { BudgetLimits, EXPENSE_CATEGORIES, ExpenseCategory } from "@/lib/finance-types";

interface BudgetManagerProps {
  budgets: BudgetLimits;
  onChange: (budgets: BudgetLimits) => void;
  spendingByCategory: Record<string, number>;
  formatAmount: (n: number) => string;
}

function thresholdColor(pct: number) {
  if (pct >= 100) return "bg-destructive";
  if (pct >= 80) return "bg-orange-500";
  return "bg-income";
}

function thresholdTextColor(pct: number) {
  if (pct >= 100) return "text-destructive";
  if (pct >= 80) return "text-orange-500";
  return "text-muted-foreground";
}

export function BudgetManager({
  budgets,
  onChange,
  spendingByCategory,
  formatAmount,
}: BudgetManagerProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<BudgetLimits>(budgets);

  function openDialog() {
    setDraft(budgets);
    setOpen(true);
  }

  function save() {
    onChange(draft);
    setOpen(false);
  }

  const activeLimits: { label: string; limit: number; spent: number }[] = [];
  if (budgets.overall) {
    const spentOverall = Object.values(spendingByCategory).reduce((a, b) => a + b, 0);
    activeLimits.push({ label: "Overall Budget", limit: budgets.overall, spent: spentOverall });
  }
  for (const cat of EXPENSE_CATEGORIES) {
    const limit = budgets.byCategory[cat];
    if (limit) {
      activeLimits.push({ label: cat, limit, spent: spendingByCategory[cat] ?? 0 });
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-card-foreground">Budgets</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button
              type="button"
              onClick={openDialog}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
            >
              <Settings2 className="h-3.5 w-3.5" />
              Manage
            </button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Manage Budget Limits</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-sm font-medium text-foreground">
                  Overall monthly cap
                </label>
                <input
                  type="number"
                  min="0"
                  value={draft.overall ?? ""}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      overall: e.target.value === "" ? null : parseFloat(e.target.value),
                    }))
                  }
                  placeholder="No overall cap set"
                  className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">Category caps</p>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 text-sm text-muted-foreground">{cat}</span>
                    <input
                      type="number"
                      min="0"
                      value={draft.byCategory[cat] ?? ""}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          byCategory: {
                            ...prev.byCategory,
                            [cat]: e.target.value === "" ? undefined : parseFloat(e.target.value),
                          },
                        }))
                      }
                      placeholder="No cap"
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                    />
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={save}
                className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Save Budgets
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {activeLimits.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No budget limits set yet. Click "Manage" to add overall or per-category caps.
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {activeLimits.map((item) => {
            const pct = item.limit > 0 ? Math.min((item.spent / item.limit) * 100, 999) : 0;
            return (
              <li key={item.label}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{item.label}</span>
                  <span className={thresholdTextColor(pct)}>
                    {formatAmount(item.spent)} / {formatAmount(item.limit)}
                  </span>
                </div>
                <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ease-out ${thresholdColor(pct)}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
                {pct >= 100 && (
                  <p className="mt-1 text-xs font-medium text-destructive">
                    Over budget by {formatAmount(item.spent - item.limit)}
                  </p>
                )}
                {pct >= 80 && pct < 100 && (
                  <p className="mt-1 text-xs font-medium text-orange-500">
                    Approaching limit — {pct.toFixed(0)}% used
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export type { ExpenseCategory };
