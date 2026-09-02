export type TransactionType = "income" | "expense";

export const EXPENSE_CATEGORIES = [
  "Housing",
  "Dining Out",
  "Groceries",
  "Transport",
  "Utilities",
  "Entertainment",
  "Health",
  "Shopping",
  "Other",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export interface Transaction {
  id: string;
  description: string;
  amount: number; // always stored in base currency (INR)
  type: TransactionType;
  category: ExpenseCategory | "Income";
  createdAt: number; // epoch ms, used as the transaction date
}

export interface BudgetLimits {
  overall: number | null;
  byCategory: Partial<Record<ExpenseCategory, number>>;
}

export const DEFAULT_BUDGETS: BudgetLimits = {
  overall: null,
  byCategory: {},
};

export const SUPPORTED_CURRENCIES = ["INR", "USD", "EUR", "GBP"] as const;
export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
};
