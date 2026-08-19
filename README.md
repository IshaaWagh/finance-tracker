# Simple Balance

Build a simple, clean, responsive personal finance tracker web app.

Core Concept

This is a very basic finance tracker. Keep the app minimal and do not add unnecessary features.

The user should be able to:

See their total income at the top.

See their total expenses at the top.

See their current balance at the top.

Add a transaction using only description, amount, and income/expense.

See all transactions in a transaction history.

Delete transactions.

Dashboard

At the top of the page, create 3 summary cards:

Total Income

Display the sum of every transaction marked as Income.

Total Expense

Display the sum of every transaction marked as Expense.

Balance

Calculate:

Balance = Total Income - Total Expense

These 3 values must update automatically whenever a transaction is added or deleted.

Use:

Green for income

Red for expenses

A neutral/dark color for balance

Use Indian Rupee formatting (₹).

Add Transaction

Create a simple "Add Transaction" section.

Fields:

Description

Text input with placeholder:
"e.g. Salary, Rent, Groceries"

Amount

Number input with placeholder:
"Enter amount"

Transaction Type

Use a simple toggle or two buttons:

Income

Expense

Add Transaction Button

Button text:
"Add Transaction"

When the user clicks Add Transaction:

Validate that description is not empty.

Validate that amount is greater than 0.

Add the transaction to the transaction history.

Automatically update Income, Expense, and Balance.

Clear the form after successful submission.

Default transaction type should be Expense.

Transaction History

Create a "Transaction History" section below the form.

Each transaction should display:

Description

Income or Expense

Amount

Delete button

Example:

Salary Income +₹50,000 Delete
Rent Expense -₹15,000 Delete
Groceries Expense -₹5,000 Delete

Show the newest transaction first.

Income amounts should be green and display with a "+" sign.

Expense amounts should be red and display with a "-" sign.

If there are no transactions, show:

"No transactions yet"

Delete Functionality

Each transaction must have a delete button.

When a transaction is deleted:

Remove it immediately.

Recalculate Total Income.

Recalculate Total Expense.

Recalculate Balance.

Data Persistence

Use browser localStorage to save transactions.

Transactions must remain available after:

Page refresh

Browser restart

No authentication or database is required for this basic version.

UI/UX

Make the design modern but extremely simple.

Use:

Clean white/light background

Rounded cards

Subtle borders/shadows

Good spacing

Modern typography

Green for income

Red for expenses

Responsive mobile design

Desktop layout:

Header/title at top

3 summary cards in one row

Add Transaction form below

Transaction History below the form

Mobile layout:

Stack the 3 summary cards vertically

Form fields should be easy to use on mobile

Transaction history should remain readable without horizontal scrolling

Header

At the top, show:

"Finance Tracker"

Subtitle:

"Track your income and expenses simply."

Do not add charts, graphs, categories, budgets, bank accounts, investments, authentication, notifications, recurring transactions, or other advanced features.

Important

Keep the entire application focused on one thing:

Quickly adding income and expenses and seeing the current balance.

Make all calculations reliable and update the UI instantly after adding or deleting transactions.

Build the complete working frontend, not just a static design.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e9c00567-e2e0-474b-b7f4-f4d9c41a69e2).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
