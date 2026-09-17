# Simple Expenses

A private personal finance tracker built from Simple Expenses.xlsx and the supplied SRS. Income, paid/pending/cancelled expenses, opening account balances, account transfers, two-way debts, dated repayments, elapsed days, month filters, CSV/JSON exports and recoverable deletion are included.

## Run locally

Use Node 22.13 or later. Install with `npm run install:ci`, build with `npm run build`, then start a development preview with `npm run dev`. Apply the generated SQL files in `drizzle/` to the local D1 database before opening the ledger. The portable preview supplies a local test identity through its sign-in flow. Hosted access and identity are enforced by Sites.

## Data and migration

Amounts are integer paisa. All authoritative balances and debt totals are computed on the server. Records are scoped to the authenticated user, edits use version checks, writes preserve revision history, and repayment inserts include a database-level overpayment guard.

The workbook is imported once on first use. All nine months reconcile to the original Summary sheet. Income dates use the first of the month because only monthly totals were recorded. One undated expense uses its recorded month's first day. Blank expense statuses become pending. Imported debt dates are unknown. The workbook's Loan column means money owed by the user; I will get means money owed to the user.

Savings means the combined current balance of the real accounts. It is never imported as a separate account or income source. The workbook’s Bank (-403), Cash (0), Bkash (7,800) and EBL (66,900) balances sum to 74,297 BDT, exactly the workbook’s Savings cell. Existing installations archive the previously duplicated aggregate account with a backup and revision history. Income and expenses have month filters. Overview shows only current balance and quick entry actions; account balances and transfers appear in Accounts, and loan details appear in Debts. Charts and repeated summaries were removed.

The four real account balances are starting snapshots at migration (2026-09-16), not January opening balances. Historical entries do not move cash because their accounts were not recorded and doing so would double count the snapshot. New debts require an account: lending deducts money and borrowing adds money automatically. Repayments require an account and move cash in the reverse direction, without counting as income or expense. These rules are enforced on the server without an opt-in checkbox. Imported opening debts remain cash-neutral when edited without an account; selecting an account records their cash movement. Editing an existing cash-linked amount or account recalculates its movement without posting it twice.

Transfers are single ledger records: the source is deducted and the destination credited together. Editing, deleting or restoring a transfer recalculates both sides, without changing combined balance, income, expenses or monthly surplus. Choose Accounts → Transfer money to record one. The app uses a colorful dark interface with responsive layouts.

The app saves a daily snapshot on active days, before changes. This is an activity-triggered safeguard rather than an unattended daily backup service. Full JSON and CSV backups can be downloaded in Settings. Deleting a debt atomically deletes its active repayments and reverses all linked account movements. Restoring it restores only repayments removed with that debt; repayments deleted separately remain deleted. Both operations preserve revision history. Soft-deleted entries can be restored through Settings; backups are retained in D1. Source changes and redeployments never overwrite existing records.

## Verification

The local acceptance checks reconcile every populated month, starting account and debt totals, then verify expense status changes, income cash movements, dated partial/full repayments, overdue flags, simultaneous overpayment rejection, deletion/restore, stale edit protection and authentication. Transfer acceptance checks verify both account movements, unchanged total balance and reports, invalid and same-account rejection, editing, stale version rejection, delete/restore, and simultaneous transfers. The updated dark interface passes TypeScript validation and the production build.

Debt deletion checks cover both directions, partial and fully settled debts, grouped restoration, separately deleted repayments, repeated deletion, stale versions and concurrent repayment/deletion. They verify that existing records and balances are preserved.
