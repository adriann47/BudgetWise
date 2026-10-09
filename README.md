# BudgetWise

## Overview
BudgetWise is a mobile-first expense and budgeting app for students. It tracks expenses in Philippine pesos, groups spending by category and supports optional monthly category budgets.

Week 2 adds Login, Register and Logout, PostgreSQL-backed sessions, and private expense/budget records for each account. The browser-only Week 1 demo remains available through the original mock API switch.

See [Categories and Profile](docs/week-2-categories-profile.md) for this update, migration instructions, API additions and checks.

## Setup and installation
Requirements: Git, Node.js 22 or newer with npm, and PostgreSQL 17 or newer (local or hosted on Supabase) for real accounts. The database is not needed in demo mode.

```powershell
git clone https://github.com/adriann47/BudgetWise.git
cd BudgetWise
cd server
npm.cmd install
Copy-Item .env.example .env
```

For Supabase, use your project?s Session pooler PostgreSQL URL, keep the Data API disabled, and set DATABASE_CA_FILE to your downloaded certificate if needed. For local PostgreSQL, create a database named `budgetwise`, owned by a dedicated login role. Configure `DATABASE_URL` and a random `SESSION_SECRET` in the private `server/.env`. Example URL: `postgresql://budgetwise:YOUR_PASSWORD@127.0.0.1:5432/budgetwise`.

Generate your own secret and put its output into `SESSION_SECRET`:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
npm.cmd run db:migrate
```

Migrations create the tables without deleting accounts or financial records. Register through the app to create an account; no real-account seed is provided. The old sightings SQL files are historical starter material and are not the current setup path.

Then install the client:

```powershell
cd ../client
npm.cmd install
Copy-Item .env.example .env
```

For real accounts, set:

```text
VITE_USE_MOCK_API=false
VITE_API_BASE_URL=
```

For the standalone browser demo, use `VITE_USE_MOCK_API=true`. Demo mode does not create real accounts or connect to PostgreSQL.

**On the development computer used for this project**, a project-local PostgreSQL installation is already configured under `.local/`. See [Week 2 setup](docs/week-2-auth.md) for its start/stop commands. This private directory is not committed and does not travel with a Git clone.

## Configuration

| Variable | Location | Example / purpose |
| --- | --- | --- |
| `DATABASE_URL` | server `.env` | PostgreSQL connection string with dedicated application credentials. |
| `SESSION_SECRET` | server `.env` | At least 32 random characters; private and stable between restarts. |
| `CORS_ORIGINS` | server `.env` | `http://localhost:5173,http://127.0.0.1:5173` locally. |
| `NODE_ENV` | server `.env` | `development` locally, `production` when deployed. |
| `COOKIE_SAME_SITE` | server `.env` | `lax` by default; cross-site HTTPS configuration is described in the setup guide. |
| `PORT` | server host | Defaults to `3000`; normally supplied by the hosting service. |
| `TRUST_PROXY_HOPS` | server host, optional | Set only to match a known reverse proxy. |
| `DATABASE_SSL` | server `.env`, optional | `true` to require verified TLS for a locally named database host. Remote hosts use verified TLS automatically. |
| `DATABASE_CA_FILE` | server `.env`, optional | Path to the provider's CA certificate. |
| `VITE_USE_MOCK_API` | client `.env` | Only `false` enables the real API. |
| `VITE_API_BASE_URL` | client `.env` | Empty for the local proxy; HTTPS API origin when deployed separately. |
| `VITE_BASE_PATH` | client build environment | `/BudgetWise/` on project Pages; supplied by the existing workflow. |

Never commit `.env`, session secrets or database credentials. All `VITE_` values are public. Restart Vite after changing local configuration; rebuild when changing deployment variables.

## How to run
With Supabase, keep the hosted database available; no local database startup is needed. With local PostgreSQL, start it first. Then in `server/`:

```powershell
npm.cmd run dev
```

In another terminal, in `client/`:

```powershell
npm.cmd run dev
```

Open **http://localhost:5173**. Real mode shows Login; choose Create an account to register. The API runs on port 3000. Vite forwards `/api` requests to it. If Vite selects another port, update the allowed origin in `server/.env` and restart the API.

Health checks:
- `http://localhost:3000/healthz` checks the API process.
- `http://localhost:3000/readyz` checks database access and migrations.

Build with `npm.cmd run build` in `client/`. `npm.cmd run preview` serves the build; real API testing through preview requires an explicit API URL and an allowed preview origin because the development proxy does not apply there.

## Features and usage
- **Accounts:** register using a name, email and 12–128 character password; log in, refresh while staying signed in, and log out.
- **Dashboard:** review monthly spending, expense count, recent expenses and spending by category.
- **Expenses:** add/delete entries, search descriptions, filter by category and sort records.
- **Budgets:** set or edit a monthly limit per category and view progress or overspending.
- **Categories:** add, edit, archive and restore your categories; view their expenses.
- **Profile:** edit your display name, view email and join date, change your password and log out.
- **Responsive navigation:** top navigation on desktop and bottom navigation on phones.

New real accounts start empty. Their data is stored in PostgreSQL and is filtered by the server-derived user ID. Demo data stays in localStorage and is not imported automatically. Clearing browser storage does not delete PostgreSQL account records.

### Main API endpoints
- `GET /api/auth/me` — current user (or null) and a CSRF token.
- `POST /api/auth/register` — create an account and sign in.
- `POST /api/auth/login` — verify credentials and sign in.
- `POST /api/auth/logout` — destroy the session.
- `GET /api/expenses` — list owned expenses.
- `POST /api/expenses` — create an owned expense.
- `PUT /api/expenses/:id` — update an owned expense (UI pending).
- `DELETE /api/expenses/:id` — delete an owned expense.
- `GET /api/budgets` — list owned budgets.
- `PUT /api/budgets/:month/:category` — set an owned category limit.
- `DELETE /api/budgets/:month/:category` — remove an owned limit (UI pending).

Mutating requests require an allowed Origin, JSON and a session-bound CSRF token. The HTTP adapter handles cookies and tokens. Passwords are salted and hashed with scrypt; the browser cookie is HTTP-only. Details are in [the authentication guide](docs/week-2-auth.md).

## Project structure
- `client/src/AuthRoot.jsx` — Login/Register, session restoration and logout.
- `client/src/App.jsx` — Dashboard, Expenses, Budgets and Categories.
- `client/src/styles.css` — responsive app and authentication styling.
- `client/src/api/` — shared interface, mock implementation and real HTTP requests.
- `server/app.js` — Express authentication, request protection and owned-data routes.
- `server/passwords.js` — password hashing and verification.
- `server/validation.js` — server-side validation.
- `server/db/migrations/` — versioned PostgreSQL schema.
- `server/db/migrate.js` — transaction-based migration runner.
- `server/test/auth.test.js` — integration tests against real PostgreSQL in a temporary schema.
- `docs/week-2-auth.md` — full configuration and startup guide.

## Screenshots
These are the earlier Week 1 interface screenshots. Authentication screenshots remain to be captured after visual browser verification.

![Week 1 desktop dashboard](docs/assets/week1-desktop.png)
![Week 1 mobile dashboard](docs/assets/Week1_Mobile.png)

## Verification and known limitations
- Real PostgreSQL integration checks passed for registration, duplicate emails, hashing, incorrect credentials, request protection, account isolation, API restarts, logout, session expiration and throttling.
- Production frontend build passed. The local database start/stop commands and repeatable migrations were checked.
- Automated browser access was unavailable during the Week 2 work; visual and full browser-flow verification remains to be completed.
- Password reset, email verification, expense-editing UI, budget-deletion UI remain future work.
- Live hosting and physical-phone authentication are not yet verified. For production, prefer same-site frontend/API hosting; unrelated domains can run into third-party cookie restrictions.
- The existing Pages workflow can still publish the mock demo. Do not disable mock mode in the hosted build until the API/database and HTTPS cookie configuration are deployed and tested.
- The rate limiter is per API process. Multiple production replicas need a shared limiter store.

## AI assistance
OpenAI Codex assisted with code, tests, setup and documentation. See [AI-USAGE.md](AI-USAGE.md). Review and understand generated work before submitting it.

## Asset credits

- **Fonts:** DM Sans by the DM Sans Project Authors and Manrope by the Manrope Project Authors are loaded through Google Fonts in `client/src/styles.css`. Both are licensed under the SIL Open Font License 1.1. See the [DM Sans license](https://github.com/google/fonts/blob/main/ofl/dmsans/OFL.txt) and [Manrope license](https://github.com/google/fonts/blob/main/ofl/manrope/OFL.txt).
- **Screenshots:** `docs/assets/week1-desktop.png` and `docs/assets/Week1_Mobile.png` show the BudgetWise Week 1 demo interface with fictional sample expenses. The fonts and interface assets visible in them retain their respective credits.
- **Icons:** The inline SVG paths in `client/src/components/Icon.jsx` were added during AI-assisted interface development. Their original source has not been independently verified; this credit does not establish exclusive authorship or a third-party license. Icon provenance remains an open item in the asset review.
- **Brand mark:** The current BudgetWise mark is the letter B rendered as text and styled in the app.

Third-party assets retain their own licenses; the project MIT license does not replace those terms.

## License
MIT; see [LICENSE](LICENSE).
## Vercel deployment

Use the repository root and the Other preset to deploy the real frontend and Express API together. Follow [the Vercel deployment guide](docs/vercel-deployment.md) for environment variables, build settings, verification and known limitations. The local two-terminal workflow is unchanged.
