# Simple Expenses

A private personal finance tracker built from Simple Expenses.xlsx and the supplied SRS. Income, paid/pending/cancelled expenses, opening account balances, two-way debts, dated repayments, elapsed days, monthly and category reports, CSV/JSON exports and recoverable deletion are included.

## Run locally

Use Node 22.13 or later. Install with `npm run install:ci`, build with `npm run build`, then start a development preview with `npm run dev`. Apply the generated SQL files in `drizzle/` to the local D1 database before opening the ledger. The portable preview supplies a local test identity through its sign-in flow. Hosted access and identity are enforced by Sites.

## Data and migration

Amounts are integer paisa. All authoritative balances and debt totals are computed on the server. Records are scoped to the authenticated user, edits use version checks, writes preserve revision history, and repayment inserts include a database-level overpayment guard.

The workbook is imported once on first use. All nine months reconcile to the original Summary sheet. Income dates use the first of the month because only monthly totals were recorded. One undated expense uses its recorded month's first day. Blank expense statuses become pending. Imported debt dates are unknown. The workbook's Loan column means money owed by the user; I will get means money owed to the user.

The five current account balances are starting snapshots at migration (2026-09-16), not January opening balances. Historical entries do not move cash because their accounts were not recorded and doing so would double count the snapshot. New transactions normally move cash. Existing debts start as outstanding balances without a new cash movement. Future repayments move cash without counting as income or expense.

The app saves a daily snapshot on active days, before changes. This is an activity-triggered safeguard rather than an unattended daily backup service. Full JSON and CSV backups can be downloaded in Settings. Soft-deleted entries can be restored through Settings; backups are retained in D1. Source changes and redeployments never overwrite existing records.

## Verification

The local acceptance checks reconcile every populated month, starting account and debt totals, then verify expense status changes, income cash movements, dated partial/full repayments, overdue flags, simultaneous overpayment rejection, deletion/restore, stale edit protection and authentication. Desktop and 390px mobile layouts and actual form submission were also checked.
