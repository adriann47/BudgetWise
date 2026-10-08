# Restricted database access

BudgetWise's Express server uses `DATABASE_URL`. Migrations and automated tests
use `ADMIN_DATABASE_URL` when present, falling back to `DATABASE_URL` for the
original local setup.

## One-time Supabase setup

1. Stop the Express server. Leave the existing Supabase administrator URL in
   `server/.env`; keep the certificate configuration and session secret.
2. In a terminal in `server`, run `npm.cmd run db:migrate` to ensure all current
   migrations are installed, then `npm.cmd run db:runtime:setup`.
3. The setup creates `budgetwise_app` with a generated password, grants access to
   the five application tables and three ID sequences, and verifies a new login.
   It then updates the ignored `.env`: `DATABASE_URL` becomes the runtime
   connection and `ADMIN_DATABASE_URL` retains the administrator connection.
4. Start Express with `npm.cmd run dev`. Start the Vite client separately as usual.
   Verify login, creating an expense and editing a category.

The setup uses the Supabase session pooler's `role.projectref` username format.
It preserves verified TLS and the existing session secret. It prints no passwords.
If verification fails, the existing `.env` remains unchanged. A generated password
may remain in the ignored `.local/budgetwise-runtime.json` for retry; rerun the
same command after resolving the error. Do not share or commit that file.
On success it is removed. Repeating a successful setup does not rotate the password.

## Permissions and boundaries

- Users and categories: select, insert and update.
- Expenses, budgets and sessions: select, insert, update and delete.
- User, expense and category ID sequences: usage.
- No table ownership, table creation, schema changes, truncation, role creation,
  database creation, or RLS bypass is granted.
- RLS is enabled on all six tables. Server-only policies allow the five application
  tables; migration history remains administrator-only. Express enforces each
  user's ownership. The server role can access all users' application rows and
  must remain private; this is not per-user database RLS.
- Table and sequence access is revoked from PUBLIC, anon and authenticated.
  Default grants for future tables/sequences created by the migration account are
  revoked too. Other object creators and database functions need separate review.
- Keep Supabase's Data API disabled under Integrations > Data API > Overview.
  The setup does not change that dashboard setting.

Only the runtime URL belongs in the deployed Express environment. Do not put
either URL in client/Vite variables. Keep the administrator URL with local or
controlled migration/test tooling. Retaining it in local `.env` separates database
usage, but does not isolate it from someone who can read that file.

## Tests and future migrations

`npm.cmd test` creates a random test schema and temporary database login using the
administrator connection. The API tests then connect as that restricted login.
They verify ordinary features and denial of schema changes, truncation and role
creation. Cleanup removes the temporary schema and role; production records are
not reset. This requires administrator role-creation privileges.

New tables receive no runtime grants automatically. When a migration adds a table
or enables RLS, explicitly update `runtimeGrants.js` and the tests before running
the setup again. Run migrations using `npm.cmd run db:migrate`.

Connection format reference: https://supabase.com/docs/guides/database/connecting-to-postgres

## Reapplying the verified security configuration

The October 8 manual SQL changes are now implemented by db/security.js and
runtimeGrants.js. Both db:migrate and db:runtime:setup reapply them. Existing
records are preserved, and repeated runs replace the named server policies.
Migrations secure the tables even before budgetwise_app exists; run runtime setup
after migrations on a new Supabase database to create that role and its policies.
The commands use transactions, so a failed permission update is rolled back.

After applying this update to an existing installation, run npm.cmd run db:migrate
and npm.cmd test from server. There is no need to rerun password setup or replace
.env. Tests simulate the older Supabase grants in an isolated schema, check their
removal and future defaults, then exercise the API with a restricted login.
