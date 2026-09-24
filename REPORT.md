# Weekly Increment Report

**Week of:** September 21, 2026 (Week 1; updated September 24)

## What changed this week
- Reviewed the instructor's React/Vite client, mock API, Express server and PostgreSQL starter.
- Replaced the haunted-sightings client with BudgetWise branding and a responsive expense dashboard.
- Added expense creation, listing, confirmed deletion, month filtering, monthly totals and spending by category.
- Added fictional PHP expense data and browser persistence under a BudgetWise-specific storage key. Amounts are stored as integer centavos.
- Preserved the shared mock/HTTP API interface and visible demo notice. Prepared expense HTTP calls; the server routes remain future work.
- Rewrote the README with setup, configuration, run commands, features, API status, project structure, screenshots and limitations. Updated the AI-use record.

## Why
The goal was to establish a small, working BudgetWise foundation for Week 1 while following the instructor's mock API → Express API → PostgreSQL workflow. Building the expense flow first gives the later budgeting screens a useful data source and lets interface work proceed before backend deployment.

## What broke or what I got stuck on
- The original template still used sightings throughout the client and server; the data model and interface needed to be adapted together.
- Earlier planning referred to `realApi.js` and `App.css`, but the actual starter uses `httpApi.js` and `styles.css`.
- The real expense API is not available yet. Turning mock mode off now would fail, so the current milestone explicitly remains a browser demo.
- Live deployment and a real PostgreSQL connection have not been verified for this increment. Local checks must not be presented as proof that the deployed app works.

## What is left
- Verify the updated app at its deployed URL and on a physical phone.
- Add budgets, expense editing and category management; refine the mockups and design documentation.
- Design the expense/budget/category database tables and implement matching Express endpoints with server validation.
- Decide and implement account ownership before storing multiple users' private financial data.
- Deploy the API and database, switch the client to the real API and test the full flow.
- Add submission links or copies in the course workspace's `project/` folder and review the report before submission.

## Verification for this increment
- Production client build passed, including generation of the GitHub Pages fallback page.
- Browser checks passed for add, reload persistence, delete, exact centavo totals, empty-month display, invalid amount rejection and corrupted-storage error/retry.
- Checked browser widths of 390px and 320px for horizontal overflow; none detected. Desktop and phone-width screenshots are included in the README.
- These are local checks. Physical-phone use, deployment and PostgreSQL are still unverified.
