# Week 2: accounts and PostgreSQL

BudgetWise now has registration, login, logout and private account data. React sends JSON requests to Express; Express stores users, sessions, expenses and budgets in PostgreSQL. The browser receives an HTTP-only session cookie. Passwords and session tokens are not stored in localStorage.

## Local setup on this computer

The project-local database binaries and database files are in `.local/` at the repository root. That directory and `server/.env` are git-ignored. PostgreSQL listens only on `127.0.0.1:5432`. The application connects using the dedicated `budgetwise` database role, not the administrator role.

Open three terminals as needed. Use `npm.cmd` in Windows PowerShell if `npm` is blocked by its script execution policy.

1. Start the database (skip if already running):

```powershell
cd D:\apsi_project\BudgetWise\server
npm.cmd run db:local:start
```

2. Apply migrations and start Express:

```powershell
npm.cmd run db:migrate
npm.cmd run dev
```

3. Start React in another terminal:

```powershell
cd D:\apsi_project\BudgetWise\client
npm.cmd run dev
```

Open **http://localhost:5173**. The real mode client must use:

```text
VITE_USE_MOCK_API=false
VITE_API_BASE_URL=
```

The blank API URL makes Vite forward `/api` to Express at port 3000. Use the same frontend address consistently; `localhost` and `127.0.0.1` have separate cookies. Port 5178 was the old demo preview, not the current account-backed app.

Register with a name, email and password of 12–128 characters. Registration signs you in. Your new account starts empty. The mock expenses from Week 1 are not imported. Reload to check your session, then use Log out when finished. Forgot-password and email verification are not implemented yet; use fictional test accounts during development.

To stop the database after stopping the API:

```powershell
npm.cmd run db:local:stop
```

To check whether it is running: `npm.cmd run db:local:status`.

## Fresh setup on another computer

Install Node.js 22 or newer, Git and PostgreSQL 17 or newer. Clone the repository and install dependencies in `server/` and `client/` using `npm.cmd install`. Project-local PostgreSQL binaries are not committed, so another clone needs its own PostgreSQL installation or a hosted database.

Create a database named `budgetwise` owned by a dedicated login role. Copy `server/.env.example` to `server/.env`, enter that database's URL and generate a private session secret:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Paste the result into `SESSION_SECRET` in the private `.env` file. Do not publish it. Run `npm.cmd run db:migrate`; this creates the tables and records the migration. It does not delete existing data. No account seed is required: create accounts in the Register screen. The old sightings schema/seed files are retained as historical starter files; do not use them for BudgetWise setup.

Copy `client/.env.example` to `client/.env` and set real mode as shown above. Then start Express and React.

## Configuration

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Server-only PostgreSQL URL including the dedicated role's credentials. |
| `SESSION_SECRET` | Server-only random secret of at least 32 characters; keep stable across restarts. Changing it signs everyone out. |
| `CORS_ORIGINS` | Comma-separated exact frontend origins. Local values: `http://localhost:5173,http://127.0.0.1:5173`. |
| `NODE_ENV` | `development` locally; `production` on the host. Production cookies require HTTPS. |
| `COOKIE_SAME_SITE` | Defaults to `lax`. Use `none` only for deliberately configured cross-site HTTPS hosting; browser third-party cookie restrictions still apply. |
| `TRUST_PROXY_HOPS` | Optional known reverse-proxy hop count. Do not enable without matching the hosting topology. |
| `DATABASE_SSL` | Optional `true` to require verified TLS for a locally named host. Remote hosts use verified TLS automatically. |
| `DATABASE_CA_FILE` | Optional path to the database provider's trusted CA certificate. Certificate verification is never disabled. |
| `PORT` | API port, normally supplied by the host; default 3000 locally. |
| `VITE_USE_MOCK_API` | `false` for real accounts; anything else uses the original browser demo without authentication. |
| `VITE_API_BASE_URL` | Empty for local Vite proxy; HTTPS API origin for separate production hosting. |

## Database tables

- `users`: normalized unique email, name, salted scrypt password hash and account creation time.
- `user_sessions`: server-side session records and expiration; the cookie contains only a signed session identifier.
- `expenses`: integer centavos, date, description, category and owning user ID.
- `budgets`: owning user ID, month, category and integer-centavo limit.
- `schema_migrations`: records which schema changes were applied.

## Routes

| Method and path | Behavior |
| --- | --- |
| `GET /api/auth/me` | Returns `{ user, csrfToken }`; `user` is null when signed out. Establishes an anonymous CSRF session if needed. |
| `POST /api/auth/register` | Creates an account and rotates the session ID. |
| `POST /api/auth/login` | Verifies credentials and rotates the session ID. |
| `POST /api/auth/logout` | Destroys the session and clears the cookie. |
| `GET /api/expenses` | Lists only the signed-in user's expenses. |
| `POST /api/expenses` | Creates an expense owned by the signed-in user. |
| `PUT /api/expenses/:id` | Updates only an owned expense; editing UI remains future work. |
| `DELETE /api/expenses/:id` | Deletes only an owned expense. |
| `GET /api/budgets` | Lists only the signed-in user's budgets. |
| `PUT /api/budgets/:month/:category` | Creates or updates that user's category budget. |
| `DELETE /api/budgets/:month/:category` | Deletes that user's budget; deletion UI remains future work. |
| `GET /healthz` | Checks the API process. |
| `GET /readyz` | Checks database access and the users table. |

All API changes require JSON, an allowed Origin and a session-bound `X-CSRF-Token`. The frontend handles those automatically. Authentication submissions are limited to 30 per 15 minutes per IP in a single API process. Multiple API replicas would need a shared rate-limit store.

## Verification

Run `npm.cmd test` in `server/`. Tests use a randomly named temporary schema in the configured development database and remove only that schema afterward. They cover signup validation, password hashing, duplicate emails, login failures, CSRF/origin checks, two-user isolation, API restarts, logout, expiration and throttling.

## Before production

Deploy the API and database over HTTPS and choose the frontend/API domain arrangement together. Prefer same-site hosting for reliable cookies. GitHub Pages plus an unrelated API domain may trigger third-party cookie restrictions. Configure allowed origins and trusted proxy settings explicitly. Live deployment, password reset, email verification and physical-phone authentication need separate validation.