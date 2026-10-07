# Categories, Profile and clearer budgets

## Apply this update

Stop Express and Vite before applying the patch. Keep your current private server/.env and client/.env files. No new dependencies are required.

From server/, run `npm.cmd run db:migrate`, then `npm.cmd run dev`. In a second terminal run `npm.cmd run dev` from client/. Open http://localhost:5173 and log in again. Existing sessions created before this update need a fresh login.

Migration 002 runs inside the existing migration transaction. It adds six categories per existing account, connects every existing expense and budget to its owner's category ID, and replaces the fixed category-name columns. Existing amounts, dates, accounts and budgets are preserved. New accounts receive six starter categories automatically. Stop the old API before migration because its category-name queries are incompatible with the new schema.

## Categories

Choose Add category; enter a name (1–40 characters) and optional description (up to 200). Names are unique within your account, ignoring case, including archived names. Edit changes the label everywhere without changing amounts or detaching history.

Archive hides a category from new expense/budget choices. Past spending remains in reports and existing budgets still count. Show archived categories and choose Restore to use one again. Categories cannot be permanently deleted from the UI. Another user's categories cannot be used or changed.

## Profile

Open Profile in the header or your signed-in name. View email and join date, edit the display name, change the password using the current password and confirmation, or log out. Password changes rotate the current session and invalidate other sessions. Currency is PHP; budgets apply per month. Email editing, profile photos, password recovery and account deletion are not implemented.

## Budget labels

Spent without a budget means spending in categories with no limit for the selected month. It is not overspending above an existing limit. The list names those categories and offers Set budget. Archived categories must first be restored.

Example: Food has a PHP 2,000 limit and PHP 2,300 spending; Transport has PHP 500 spending and no limit. Budgeted spending is PHP 2,300, spending without a budget is PHP 500, and the net excess across budgeted categories is PHP 300. Remaining across budgeted categories can offset one category's overspending against another category's unused limit; each category card still reports its own status. It is not cash available or a bank balance.

## API additions

All routes require an Express account session. Mutations also require the existing origin and CSRF checks.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | /api/categories | List owned active and archived categories |
| POST | /api/categories | Create a category |
| PUT | /api/categories/:id | Rename, describe, archive or restore |
| GET | /api/profile | Read account details |
| PATCH | /api/profile | Update name only |
| POST | /api/profile/password | Verify current password and change password |

Expenses now accept category_id. Budget PUT/DELETE paths accept the category ID. Responses also include the current category name. Legacy non-numeric category names remain accepted by Express for compatibility, but new clients should use IDs. Categories use composite ownership constraints at the database layer and owner checks in Express. The Supabase Data API remains disabled; no client Data API policies are added.

## Mock mode and checks

Mock categories, expenses and budgets use browser localStorage key budgetwise:demo:v2. The first load copies legacy Week 1 data to this format without deleting the old keys. Profile explains that mock mode has no account or password.

Run the PostgreSQL suite in server/ with `npm.cmd test`; it uses a random temporary schema and verifies its isolation before creating tables. It checks preservation of pre-migration records, account isolation, category renaming and archiving, profile ownership, password changes and session invalidation. The app's public tables are not reset. Run `node --test src/api/mockApi.test.mjs` in client/ for demo persistence tests.

For this increment, the production build passed with Vite's native config loader (the default esbuild config loader hit a sandbox access restriction). Automated visual/browser verification remains pending because the browser runtime could not start. Check the new screens on desktop and mobile before submitting screenshots.
