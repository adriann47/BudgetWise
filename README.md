# BudgetWise

## 1. Overview
BudgetWise is a mobile-first expense-tracking web app for students who want a clearer view of everyday spending. The Week 1 version records expenses in Philippine pesos and shows monthly totals and spending by category.

**Current status:** browser-only demo. The React interface uses a mock API and localStorage. The included Express/PostgreSQL server still handles the instructor's sightings example; BudgetWise backend integration is not finished.

## 2. Setup and installation
### Requirements
- Node.js 22 LTS with npm (the server requires Node.js 20 or newer).
- Git and a modern browser.
- Optional for the server starter: PostgreSQL 17, or Docker Desktop to run it.

### Get the code and install the client
```powershell
git clone https://github.com/adriann47/BudgetWise.git
cd BudgetWise
cd client
npm install
Copy-Item .env.example .env
```
Keep `VITE_USE_MOCK_API=true` for Week 1. If npm reports a blocked esbuild installation script, review the package named in the warning before approving it; the repository currently records approval for esbuild 0.25.12.

### Environment variables
Never commit actual `.env` files or credentials. All `VITE_` values are public in the client build.

| Variable | Location | Example / purpose |
| --- | --- | --- |
| `VITE_USE_MOCK_API` | `client/.env` | `true`; only the exact value `false` enables HTTP requests. Keep true until expense endpoints exist. |
| `VITE_API_BASE_URL` | `client/.env` | `http://localhost:3000`; API origin, without trailing slash. Ignored in mock mode. |
| `VITE_BASE_PATH` | build environment | `/BudgetWise/` for GitHub Pages; `/` locally. The Pages workflow supplies it automatically. |
| `DATABASE_URL` | `server/.env` | `postgresql://postgres:YOUR_LOCAL_PASSWORD@localhost:5432/haunted` for the unchanged server starter. |
| `CORS_ORIGINS` | `server/.env` | `http://localhost:5173`; comma-separated allowed browser origins. |
| `NODE_ENV` | `server/.env` | `development` locally; `production` when deployed. |
| `PORT` | API hosting environment | Provided by the host; defaults to `3000` locally. |
| `POSTGRES_PASSWORD` | root `.env`, optional Compose only | A local password you choose; never commit it. Root `.env` also supplies `CORS_ORIGINS` to Compose. |

### Optional: set up the existing server database
This is **not required for the Week 1 app**. These commands run the original sightings backend, not an expense backend. From the repository root, with Docker Desktop running:

```powershell
docker run --name budgetwise-pg -e POSTGRES_PASSWORD=YOUR_LOCAL_PASSWORD -e POSTGRES_DB=haunted -p 5432:5432 -d postgres:17
cd server
npm install
Copy-Item .env.example .env
```
Edit `server/.env` so `DATABASE_URL` uses the same password. Wait for PostgreSQL to be ready, then run:

```powershell
npm run db:reset
```
This creates the sightings table and inserts fictional examples. **The seed step deletes existing sightings data. Use a disposable development database.** Expense tables and migrations are planned for a later milestone.

## 3. How to run it
### Week 1 demo
From `client/`:
```powershell
npm run dev
```
Open `http://localhost:5173` (or the address Vite prints if that port is busy). Expect the BudgetWise dashboard, a visible demo notice, a month selector, an expense list and an Add expense form. Three fictional expenses are seeded in September 2026; select that month to see them if opening the app later.

For a phone on the same Wi-Fi:
```powershell
npm run dev -- --host
```
Open Vite's printed Network URL on your phone and allow the development server on your private network if Windows asks. Physical-phone testing remains to be completed.

To build and preview the client:
```powershell
npm run build
npm run preview
```
Open the preview URL printed by Vite, normally `http://localhost:4173`. The build also creates `dist/404.html` for GitHub Pages.

### Optional server starter
In a separate terminal, from `server/` after database setup:
```powershell
npm run dev
```
`http://localhost:3000/healthz` should return `{"ok":true}`. `/readyz` should return `{"ok":true,"db":"up"}` when PostgreSQL is reachable. Leave the client in mock mode: this server does not yet implement expenses.

### Deployment
The existing `.github/workflows/deploy-pages.yml` publishes the client on pushes to `main` when GitHub Pages is configured to use GitHub Actions and the repository meets the workflow's public-repository condition. Keep demo mode enabled for this milestone. This increment has not yet been verified on a live deployment; a successful local build is not a deployment check.

## 4. Features and usage
1. Select a month to see its total spending, expense count and top category.
2. Enter a description, positive PHP amount (up to two decimal places), category and date.
3. Select **Save expense**. The dashboard selects the expense's month and updates the totals.
4. Reload the page: expenses persist in the same browser and origin.
5. Select **Delete** on an expense and confirm to remove it.

Categories are currently fixed: Food, Transport, School, Bills, Personal and Other. Category totals are computed from expenses. No budgets or remaining-budget figures are simulated. Clearing browser data removes saved demo expenses; a fresh session seeds the examples again.

### API status
Components import `listExpenses`, `createExpense` and `deleteExpense` from `client/src/api/index.js`. Both adapters expose those functions. Monetary amounts use integer `amount_centavos`; expense dates use `YYYY-MM-DD`.

| Method | Path | Purpose | Status |
| --- | --- | --- | --- |
| GET | `/api/expenses` | List expenses | HTTP adapter prepared; server route not implemented |
| POST | `/api/expenses` | Create an expense | HTTP adapter prepared; server route not implemented |
| DELETE | `/api/expenses/:id` | Delete an expense | HTTP adapter prepared; server route not implemented |
| GET | `/healthz` | Check API process | Existing server starter |
| GET | `/readyz` | Check database connectivity | Existing server starter |
| GET / POST | `/api/sightings` | List / create sightings | Existing server starter |
| GET / PUT / DELETE | `/api/sightings/:id` | Read / update / delete a sighting | Existing server starter |

## 5. Project structure
```text
client/
  src/App.jsx                 Dashboard, expense form and monthly summaries
  src/styles.css              Mobile-first styling and desktop layouts
  src/main.jsx                React entry point
  src/api/index.js            Shared mock/HTTP interface
  src/api/mockApi.js          Browser persistence and expense validation
  src/api/httpApi.js          Planned expense HTTP requests
  src/api/seed.json           Fictional expense examples
  src/components/DemoNotice.jsx
  index.html                  Title and metadata
server/
  server.js                   Existing Express sightings routes
  sightingsRepo.js            Parameterized SQL queries
  db/                         PostgreSQL pool, schema, seed and SQL runner
docs/assets/                  Running-app screenshots
.github/workflows/            GitHub Pages deployment
REPORT.md                     Week 1 increment report
AI-USAGE.md                   AI assistance record
```

## 6. Screenshots
Running Week 1 demo at desktop and phone-sized browser widths:

![BudgetWise dashboard at desktop width](docs/assets/week1-desktop.png)

![BudgetWise dashboard at phone width](docs/assets/week1-mobile.png)

## 7. Known issues and next steps
- Expenses are stored only in this browser, not shared or backed up. The real adapter is prepared, but enabling it now will hit unimplemented expense routes.
- Budget creation, editing expenses, custom category management, accounts and per-user access control are not implemented.
- The server and database still contain the original sightings domain. They must be adapted and validated before switching out of demo mode.
- Live deployment, physical-phone testing and PostgreSQL connectivity are not verified for this increment.
- Fonts use Google Fonts when available and fall back to system fonts offline.
- Next: add budgets and category management in mock mode, then implement matching Express endpoints and PostgreSQL tables.

## AI assistance
OpenAI Codex assisted with repository inspection, the Week 1 client implementation, checks and documentation drafts. See [AI-USAGE.md](AI-USAGE.md) for the record. The student should review and understand the changes before submission.

## License
MIT; see [LICENSE](LICENSE).

## Verification for this increment
- Production client build passed, including generation of the GitHub Pages fallback page.
- Browser checks passed for add, reload persistence, delete, exact centavo totals, empty-month display, invalid amount rejection and corrupted-storage error/retry.
- Checked browser widths of 390px and 320px for horizontal overflow; none detected. Desktop and phone-width screenshots are included in the README.
- These are local checks. Physical-phone use, deployment and PostgreSQL are still unverified.
