## October 8, 2026 - Database permissions and security records
- **Tool:** OpenAI Codex.
- **Request:** Separate runtime and administrator database access, guide the Supabase permission changes, and save the verified setup and security records.
- **AI assistance:** Prepared the restricted-role setup, reviewed the SQL in a rolled-back transaction, explained grants and RLS, and prepared repeatable setup code and automated tests. Prepared an updated security checklist.
- **My actions:** I applied the runtime-account setup, ran the permission SQL manually in Supabase, checked the verification results, and tested login/logout, expenses, budgets, categories and registration with a fictional email. I reported that these worked.
- **What I kept and why:** A restricted Express account, an administrator connection for migrations/tests, and server-only RLS policies. Express continues checking which user owns each record.
- **Correction:** The initial dashboard directions were imprecise; Codex checked the documentation and corrected the Data API location to Integrations > Data API > Overview.
- **Verification:** The updated integration suite passed all 13 reported tests, including repeatable grants/RLS, future-object permissions and account isolation. The current runtime connection was confirmed as budgetwise_app without superuser, create-role, create-database or RLS-bypass privileges. All six current tables have RLS. Automated tests use a disposable schema and temporary login, not real application records.
- **Limits:** Database policies trust Express and do not isolate individual users by themselves. Data API dashboard status, network restrictions and several GitHub checks remain unverified. This is not a complete deployment-security sign-off.
- **Delivery:** The repeatable setup and documentation update were prepared as a patch because local write access was not granted. Apply and review it before treating those repository changes as installed.
- **Commit:** Pending; add the actual commit link after committing. No commit or push was performed by Codex.

## October 4, 2026 - Categories, Profile and budget clarity
- Tool: OpenAI Codex, following the approved feature proposal.
- Changes: account-owned category IDs, add/edit/archive/restore UI and API, record-preserving migration, display name and password settings, clearer unbudgeted spending breakdown, mock persistence migration and documentation.
- Verification: PostgreSQL integration suite passed (11 reported tests including parent suite); mock adapter tests passed (2); production build passed using Vite native config loader. Tests used a disposable schema and did not migrate the application's public tables.
- Limits: browser runtime unavailable; visual and interactive UI review still pending. Work prepared in a separate working copy because local repository write permission was not granted. Apply the patch and migration before using these features.
- Student review: pending. No commit or push performed by Codex.

# Week 2 AI assistance

## October 1, 2026 — Week 2 authentication
- **Tool:** OpenAI Codex.
- **Request:** Implement Login/Register screens and working Express/PostgreSQL authentication together.
- **Changes:** Account screens, salted scrypt hashes, PostgreSQL session storage, HTTP-only cookies, CSRF and origin checks, authentication throttling, private expense/budget routes, migrations, and local database setup.
- **Checks:** Real PostgreSQL integration tests passed, including two-user isolation, logout, expiry and API restarts. Frontend production build passed. Browser automation was unavailable, so visual browser testing remains outstanding.
- **Issue resolved:** Windows PowerShell blocked the npm PowerShell wrapper, so commands use npm.cmd. The PostgreSQL control program could not create a restricted token in the sandbox; launching the installed database process directly with a hidden window worked, and the start/stop script was verified.
- **Privacy:** Local credentials and database files are git-ignored. No real-user data was seeded. Tests use a disposable, randomly named database schema.
- **Student review and commit:** Pending. Add the actual commit link and your own explanation after review.
# AI usage — BudgetWise

## September 24, 2026 — Week 1 foundation
- **Tool:** OpenAI Codex.
- **Request:** Inspect the instructor starter, then establish the basics for the Week 1 report and documentation deadline.
- **Assistance:** Repository inspection; React dashboard and expense form; responsive CSS; mock expense persistence and validation; matching HTTP adapter; documentation and screenshot preparation.
- **What was retained:** The React/Vite client, shared mock/HTTP interface, demo-mode environment switch, visible demo notice and original Express/PostgreSQL starter.
- **Verification:** Production build; browser checks for creation, persistence after reload, deletion, monthly totals, empty states, invalid amounts and corrupted-storage recovery; layouts at 390px and 320px; desktop and mobile screenshots.
- **Limitations:** No deployed-site, physical-phone or real PostgreSQL verification. Budget and category management remain unimplemented.
- **Student review:** Pending. The student should explain the implementation in their own words, record their own contributions and update this record after review.
- **Commit:** Pending; this increment has not been committed or pushed by Codex. Add the actual commit link after committing.

## Correction identified during inspection
Earlier conversation guidance named `realApi.js` and `App.css`; the actual starter uses `httpApi.js` and `styles.css`. Implementation and documentation now use the repository's real paths.

---

The instructor's original record template follows, for continued use throughout the project. Its unfilled sections are not claims of completed work.
# AI usage

This project was built with AI assistance. This file is the record of it. It is
graded as the finals badge, and it is worth 100 points.

Start it in week 1 and keep it up as you go. The commit history of this file is
part of the evidence: a file written all at once the night before the deadline
looks exactly like what it is.

## 1. How I used AI

At least six entries. One per real use. Every entry needs a commit link.

### YYYY-MM-DD - short title

- **Tool:**
- **What I asked for:**
- **What it gave back:**
- **What I kept, what I changed, and why:**
- **Commit:** https://github.com/YOUR-USERNAME/YOUR-REPO/commit/SHA

## 2. Where the AI got it wrong

Three cases. Be specific. If you write that the AI was never wrong, this section
scores zero.

### Case 1 - short title

- **What it gave me:**
- **What was wrong with it:**
- **What I did instead:**
- **Commit:** https://github.com/YOUR-USERNAME/YOUR-REPO/commit/SHA

## 3. Who wrote what

At least a fifth of this project is code you wrote yourself. Name it, and explain
it in your own words.

> Group projects: give each member their own heading below, and use your GitHub
> handle as the heading. You are graded on your own section.

### Written by me

- **File:**
- **Commit:**
- **What it does and why it is built this way:**

### The AI-written part I understand best

- **File:**
- **Commit:**
- **What it does and why we kept it:**
