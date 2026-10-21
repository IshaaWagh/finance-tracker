import { useState, useEffect, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { useAuth } from "@/lib/use-auth";
import { supabase } from "@/lib/supabase-client";
import {
  Transaction,
  TransactionType,
  BudgetLimits,
  DEFAULT_BUDGETS,
  EXPENSE_CATEGORIES,
  ExpenseCategory,
  CurrencyCode,
} from "@/lib/finance-types";
import { convertFromBase, getStoredCurrency } from "@/lib/currency";
import { CurrencySwitcher } from "@/components/finance/currency-switcher";
import { BudgetManager } from "@/components/finance/budget-manager";
import { ExpenseCharts } from "@/components/finance/expense-charts";
import { ForecastSimulator } from "@/components/finance/forecast-simulator";
import { ReceiptScanner } from "@/components/finance/receipt-scanner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Finance Tracker - Simple Income & Expense Tracker" },
      {
        name: "description",
        content:
          "Track your income and expenses, forecast your cash flow, scan receipts, and manage budgets with a clean, minimal finance tracker.",
      },
      { property: "og:title", content: "Finance Tracker" },
      {
        property: "og:description",
        content: "Track your income and expenses simply.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const TRANSACTIONS_STORAGE_KEY = "finance-tracker-transactions";
const BUDGETS_STORAGE_KEY = "finance-tracker-budgets";

const transactionSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, "Description is required")
    .max(100, "Description must be under 100 characters"),
  amount: z.number().positive("Amount must be greater than 0"),
  type: z.enum(["income", "expense"]),
});

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

interface StoredTransaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  category?: ExpenseCategory | "Income";
  createdAt: number;
  transactionDate?: number;
}

function migrateTransaction(raw: StoredTransaction): Transaction {
  // Older stored transactions (pre-category feature) won't have a category.
  return {
    id: raw.id,
    description: raw.description,
    amount: raw.amount,
    type: raw.type,
    category: raw.category ?? (raw.type === "income" ? "Income" : "Other"),
    createdAt: raw.createdAt,
    transactionDate: raw.transactionDate ?? raw.createdAt,
  };
}

function Index() {
  const { user, loading } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<BudgetLimits>(DEFAULT_BUDGETS);
  const [currency, setCurrency] = useState<CurrencyCode>("INR");
  const [rates, setRates] = useState<Record<string, number>>({ INR: 1 });

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<TransactionType>("expense");
  const [category, setCategory] = useState<ExpenseCategory>("Other");
  const [errors, setErrors] = useState<{ description?: string; amount?: string }>({});
  const [isHydrated, setIsHydrated] = useState(false);
  const [transactionDate, setTransactionDate] = useState(
  new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10),
);

 useEffect(() => {
  let cancelled = false;

  async function loadData() {
    try {
      if (!supabase) {
        throw new Error("Supabase is not configured.");
      }

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        throw new Error("Please sign in to load your finance data.");
      }

      const [transactionsResult, budgetsResult] = await Promise.all([
        supabase
          .from("transactions")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),

        supabase
          .from("budgets")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      if (transactionsResult.error) throw transactionsResult.error;
      if (budgetsResult.error) throw budgetsResult.error;

      if (cancelled) return;

      setTransactions(
          (transactionsResult.data ?? []).map((row) => ({
            id: row.id,
            description: row.description,
            amount: Number(row.amount),
            type: row.type as TransactionType,
            category: row.category as ExpenseCategory | "Income",
            createdAt: new Date(row.created_at).getTime(),
            transactionDate: new Date(
              `${row.transaction_date}T00:00:00`,
            ).getTime(),
          })),
        );

      if (budgetsResult.data) {
        setBudgets({
          overall:
            budgetsResult.data.overall == null
              ? null
              : Number(budgetsResult.data.overall),
          byCategory: budgetsResult.data.by_category ?? {},
        });
      } else {
        setBudgets(DEFAULT_BUDGETS);
      }

      setCurrency(getStoredCurrency());
    } catch (error) {
      console.error("Failed to load finance data:", error);
    } finally {
      if (!cancelled) {
        setIsHydrated(true);
      }
    }
  }

  void loadData();

  return () => {
    cancelled = true;
  };
}, []);

  // All amounts are stored in the base currency (INR). This formats any
  // base-currency amount into the user's currently selected display currency.
  function formatAmount(amountInBase: number): string {
    const converted = convertFromBase(amountInBase, currency, rates);
    return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "INR" ? 0 : 2,
    }).format(converted);
  }

  function handleCurrencyChange(next: CurrencyCode, nextRates: Record<string, number>) {
    setCurrency(next);
    setRates(nextRates);
  }
  
  async function handleBudgetChange(nextBudgets: BudgetLimits) {
    try {
      if (!supabase) {
        throw new Error("Supabase is not configured.");
      }

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("Please sign in first.");

      const { error } = await supabase.from("budgets").upsert(
        {
          user_id: user.id,
          overall: nextBudgets.overall,
          by_category: nextBudgets.byCategory,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

      if (error) throw error;

      setBudgets(nextBudgets);
    } catch (error) {
      console.error("Failed to save budgets:", error);
      alert("Could not save your budget. Please try again.");
    }
  }


  const totals = useMemo(() => {
    const income = transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
    return {
      income,
      expense,
      balance: income - expense,
    };
  }, [transactions]);

  const spendingByCategory = useMemo(() => {
    const totalsByCategory: Record<string, number> = {};
    const now = new Date();
    for (const t of transactions) {
      if (t.type !== "expense") continue;
      const d = new Date(t.transactionDate ?? t.createdAt);
      // Budgets track the current calendar month.
      if (d.getFullYear() !== now.getFullYear() || d.getMonth() !== now.getMonth()) continue;
      totalsByCategory[t.category] = (totalsByCategory[t.category] ?? 0) + t.amount;
    }
    return totalsByCategory;
  }, [transactions]);

 
  async function addTransaction(data: {
    description: string;
    amount: number;
    type: TransactionType;
    category: ExpenseCategory | "Income";
     transactionDate: string;
  }) {
    try {
      if (!supabase) {
        throw new Error("Supabase is not configured.");
      }

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("Please sign in first.");

      const { data: row, error } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          description: data.description,
          amount: data.amount,
          type: data.type,
          category: data.category,
          transaction_date: data.transactionDate,
        })
        .select()
        .single();

      if (error) throw error;

      const newTransaction: Transaction = {
        id: row.id,
        description: row.description,
        amount: Number(row.amount),
        type: row.type as TransactionType,
        category: row.category as ExpenseCategory | "Income",
        createdAt: new Date(row.created_at).getTime(),
        transactionDate: new Date(
          `${row.transaction_date}T00:00:00`,
        ).getTime(),
      };

      setTransactions((prev) => [newTransaction, ...prev]);
      return true;
    } catch (error) {
      console.error("Failed to add transaction:", error);
      alert("Could not save the transaction. Please try again.");
      return false;
    }
  }


 
  async function handleAddTransaction(e: React.FormEvent) {
    e.preventDefault();

    const parsedAmount = parseFloat(amount);
    const result = transactionSchema.safeParse({
      description,
      amount: parsedAmount,
      type,
    });

    if (!result.success) {
      const fieldErrors: { description?: string; amount?: string } = {};

      for (const issue of result.error.issues) {
        const path = issue.path[0] as "description" | "amount";
        if (!fieldErrors[path]) {
          fieldErrors[path] = issue.message;
        }
      }

      setErrors(fieldErrors);
      return;
    }

    setErrors({});

    const saved = await addTransaction({
      description: result.data.description,
      amount: result.data.amount,
      type: result.data.type,
      category: result.data.type === "income" ? "Income" : category,
      transactionDate,
    });

    if (saved) {
      setDescription("");
      setAmount("");
      setType("expense");
      setCategory("Other");
    }
  }


  async function handleReceiptConfirm(data: {
    description: string;
    amount: number;
    category: ExpenseCategory;
  }) {
    await addTransaction({
      description: data.description,
      amount: data.amount,
      type: "expense",
      category: data.category,
      transactionDate,
    });
  }

  async function handleLogout() {
    if (!supabase) return;
    await supabase.auth.signOut();
  }

  async function handleDelete(id: string) {
    try {
      if (!supabase) {
        throw new Error("Supabase is not configured.");
      }

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("Please sign in first.");

      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      setTransactions((prev) => prev.filter((t) => t.id !== id));
    } catch (error) {
      console.error("Failed to delete transaction:", error);
      alert("Could not delete the transaction. Please try again.");
    }
  }

  if (loading) {
    return null;
  }

  if (!user) {
    window.location.href = "/auth";
    return null;
  }

  if (!isHydrated) {
    return null;
  }


  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="flex flex-col items-center gap-3 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Finance Tracker
          </h1>
          <p className="text-muted-foreground">
            Track your income and expenses, forecast the future, and stay on budget.
          </p>
         <div className="flex items-center gap-3">
            <CurrencySwitcher currency={currency} onChange={handleCurrencyChange} />

            <button
              type="button"
              onClick={handleLogout}
             className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700" >
              Logout
            </button>
          </div>
        </header>

        <section aria-label="Summary" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryCard
            label="Total Income"
            amount={totals.income}
            variant="income"
            formatAmount={formatAmount}
          />
          <SummaryCard
            label="Total Expense"
            amount={totals.expense}
            variant="expense"
            formatAmount={formatAmount}
          />
          <SummaryCard
            label="Balance"
            amount={totals.balance}
            variant="balance"
            formatAmount={formatAmount}
          />
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-card-foreground">Add Transaction</h2>

          <div className="mt-4">
            <ReceiptScanner onConfirm={handleReceiptConfirm} />
          </div>

          <form onSubmit={handleAddTransaction} className="mt-4 space-y-4">
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-foreground">
                Description
              </label>
              <input
                id="description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Salary, Rent, Groceries"
                maxLength={100}
                className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
              {errors.description && (
                <p className="mt-1 text-sm text-destructive">{errors.description}</p>
              )}
            </div>

            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-foreground">
                Amount
              </label>
              <input
                id="amount"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
              {errors.amount && <p className="mt-1 text-sm text-destructive">{errors.amount}</p>}
            </div>
            <div>
              <label
                htmlFor="transactionDate"
                className="block text-sm font-medium text-foreground"
              >
                Transaction Date
              </label>
              <input
                id="transactionDate"
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
            </div>

            <div>
              <span className="block text-sm font-medium text-foreground">Transaction Type</span>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <TypeButton
                  label="Income"
                  selected={type === "income"}
                  onClick={() => setType("income")}
                  variant="income"
                />
                <TypeButton
                  label="Expense"
                  selected={type === "expense"}
                  onClick={() => setType("expense")}
                  variant="expense"
                />
              </div>
            </div>

            {type === "expense" && (
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-foreground">
                  Category
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                  className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="submit"
              className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              Add Transaction
            </button>
          </form>
        </section>

        <BudgetManager
          budgets={budgets}
          onChange={handleBudgetChange}
          spendingByCategory={spendingByCategory}
          formatAmount={formatAmount}
        />

        <ExpenseCharts transactions={transactions} formatAmount={formatAmount} />

        <ForecastSimulator transactions={transactions} formatAmount={formatAmount} />

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-card-foreground">Transaction History</h2>

          {transactions.length === 0 ? (
            <p className="mt-4 text-center text-muted-foreground">No transactions yet</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {transactions.map((transaction) => (
                <li
                  key={transaction.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">
                      {transaction.description}
                    </p>
                    <p className="mt-0.5 text-xs capitalize text-muted-foreground">
                      {transaction.type === "expense" ? transaction.category : transaction.type}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`shrink-0 text-sm font-semibold ${
                        transaction.type === "income" ? "text-income" : "text-expense"
                      }`}
                    >
                      {transaction.type === "income" ? "+" : "-"}
                      {formatAmount(transaction.amount)}
                    </span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(
                        transaction.transactionDate ?? transaction.createdAt,
                      ).toLocaleDateString("en-IN")}
                    </p>
                    <button
                      onClick={() => handleDelete(transaction.id)}
                      className="shrink-0 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      aria-label={`Delete ${transaction.description}`}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  amount,
  variant,
  formatAmount,
}: {
  label: string;
  amount: number;
  variant: "income" | "expense" | "balance";
  formatAmount: (n: number) => string;
}) {
  const variantClasses = {
    income: "border-income/25 bg-income/5",
    expense: "border-expense/25 bg-expense/5",
    balance: "border-border bg-background",
  };

  const amountClasses = {
    income: "text-income",
    expense: "text-expense",
    balance: "text-foreground",
  };

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${variantClasses[variant]}`}>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-bold tracking-tight sm:text-3xl ${amountClasses[variant]}`}>
        {formatAmount(amount)}
      </p>
    </div>
  );
}

function TypeButton({
  label,
  selected,
  onClick,
  variant,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  variant: "income" | "expense";
}) {
  const baseClasses =
    "rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";

  const selectedClasses = {
    income: "border-income bg-income/10 text-income",
    expense: "border-expense bg-expense/10 text-expense",
  };

  const unselectedClasses =
    "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${baseClasses} ${selected ? selectedClasses[variant] : unselectedClasses}`}
      aria-pressed={selected}
    >
      {label}
    </button>
  );
}
