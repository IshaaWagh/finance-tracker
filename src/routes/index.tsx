import { useState, useEffect, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Finance Tracker - Simple Income & Expense Tracker" },
      {
        name: "description",
        content:
          "Track your income and expenses simply. Add transactions, view your balance, and manage your money with a clean, minimal finance tracker.",
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

type TransactionType = "income" | "expense";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  createdAt: number;
}

const STORAGE_KEY = "finance-tracker-transactions";

const transactionSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, "Description is required")
    .max(100, "Description must be under 100 characters"),
  amount: z.number().positive("Amount must be greater than 0"),
  type: z.enum(["income", "expense"]),
});

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function Index() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<TransactionType>("expense");
  const [errors, setErrors] = useState<{ description?: string; amount?: string }>({});
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Transaction[];
        setTransactions(parsed);
      }
    } catch {
      setTransactions([]);
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    }
  }, [transactions, isHydrated]);

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

  function handleAddTransaction(e: React.FormEvent) {
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

    const newTransaction: Transaction = {
      id: generateId(),
      description: result.data.description,
      amount: result.data.amount,
      type: result.data.type,
      createdAt: Date.now(),
    };

    setTransactions((prev) => [newTransaction, ...prev]);
    setDescription("");
    setAmount("");
    setType("expense");
  }

  function handleDelete(id: string) {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }

  if (!isHydrated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Finance Tracker
          </h1>
          <p className="mt-2 text-muted-foreground">
            Track your income and expenses simply.
          </p>
        </header>

        <section
          aria-label="Summary"
          className="grid grid-cols-1 gap-4 sm:grid-cols-3"
        >
          <SummaryCard
            label="Total Income"
            amount={totals.income}
            variant="income"
          />
          <SummaryCard
            label="Total Expense"
            amount={totals.expense}
            variant="expense"
          />
          <SummaryCard
            label="Balance"
            amount={totals.balance}
            variant="balance"
          />
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-card-foreground">
            Add Transaction
          </h2>
          <form onSubmit={handleAddTransaction} className="mt-4 space-y-4">
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-foreground"
              >
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
                <p className="mt-1 text-sm text-destructive">
                  {errors.description}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="amount"
                className="block text-sm font-medium text-foreground"
              >
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
              {errors.amount && (
                <p className="mt-1 text-sm text-destructive">{errors.amount}</p>
              )}
            </div>

            <div>
              <span className="block text-sm font-medium text-foreground">
                Transaction Type
              </span>
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

            <button
              type="submit"
              className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              Add Transaction
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-card-foreground">
            Transaction History
          </h2>

          {transactions.length === 0 ? (
            <p className="mt-4 text-center text-muted-foreground">
              No transactions yet
            </p>
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
                      {transaction.type}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`shrink-0 text-sm font-semibold ${
                        transaction.type === "income"
                          ? "text-income"
                          : "text-expense"
                      }`}
                    >
                      {transaction.type === "income" ? "+" : "-"}
                      {formatCurrency(transaction.amount)}
                    </span>
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
}: {
  label: string;
  amount: number;
  variant: "income" | "expense" | "balance";
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
    <div
      className={`rounded-2xl border p-5 shadow-sm ${variantClasses[variant]}`}
    >
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p
        className={`mt-1 text-2xl font-bold tracking-tight sm:text-3xl ${amountClasses[variant]}`}
      >
        {formatCurrency(amount)}
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
      className={`${baseClasses} ${
        selected ? selectedClasses[variant] : unselectedClasses
      }`}
      aria-pressed={selected}
    >
      {label}
    </button>
  );
}
