# AI usage

This project was built with assistance from ChatGPT and OpenAI Codex. I used AI for implementation, explanations, debugging, documentation and deployment guidance. I selected the features, reviewed the results, tested the app and made some manual changes.

This update organizes my earlier records into the instructor’s template. Dates identify the work periods rather than necessarily matching the commit dates. Some separate activities share a commit because I committed their changes together.

## 1. How I used AI

### September 24, 2026 - Week 1 foundation

- **Tool:** ChatGPT and OpenAI Codex.
- **What I asked for:** Establish the basics of BudgetWise for Week 1.
- **What it gave back:** A React interface, expense form, responsive styling, mock data persistence and draft documentation.
- **What I kept, what I changed, and why:** I kept the React/Vite starter and mock API workflow because they matched the course requirements. I chose to organize the interface into Dashboard, Expenses, Budgets and Categories, each with its own navigation link. I also fixed some errors and extras that needs to be removed edited. These changes gave each screen a clear purpose and made the app easier to navigate. AI implemented the interface changes based on my decisions.
- **Commit:** https://github.com/adriann47/BudgetWise/commit/4d1734de63205e7d5c26898395d31f8cf90bfd5c

### October 1, 2026 - Login and registration

- **Tool:** OpenAI Codex.
- **What I asked for:** Explain Express and PostgreSQL, then implement login and registration screens with working authentication.
- **What it gave back:** Authentication screens, Express routes, password hashing, database-backed sessions, validation and authentication tests.
- **What I kept, what I changed, and why:** I chose to implement working authentication together with the login and registration screens, instead of adding forms that only looked functional. I kept separate accounts so users could access their own expenses and budgets
- **Commit:** https://github.com/adriann47/BudgetWise/commit/e81a922c4d03b1626e0e4d59c8d88096880fa682

### Early October 2026 - Moving PostgreSQL to Supabase

- **Tool:** OpenAI Codex.
- **What I asked for:** Help move database hosting to Supabase after Windows blocked the local PostgreSQL tools.
- **What it gave back:** Connection configuration, certificate guidance and instructions for running migrations and inspecting tables.
- **What I kept, what I changed, and why:** I kept Express as the backend and PostgreSQL as the database, but chose Supabase to host the database after Windows blocked the local tools. I created the project and configured the connection. I checked the tables in Supabase and tested saved records because I needed to confirm that the app was using the hosted database successfully.
- **Commit:** https://github.com/adriann47/BudgetWise/commit/c5bf9aa5bebab5d340cb3909f91a01daa25cde38 — includes Supabase setup documentation. The dashboard configuration and testing were manual activities.

### October 4, 2026 - Categories, Profile and budget explanations

- **Tool:** OpenAI Codex.
- **What I asked for:** Add category management and a Profile screen, and explain spending without a budget.
- **What it gave back:** Category creation, editing, archiving and restoration, profile settings, supporting API routes and clearer budget information.
- **What I kept, what I changed, and why:** I kept category archiving and restoration so users could stop using a category without losing its existing records. I chose Profile as the place for account settings and logout, making the extra logout control in the upper section unnecessary. I also kept the separate breakdown of spending without a budget because it distinguishes categories with no limit from categories that exceed a limit.
- **Commit:** https://github.com/adriann47/BudgetWise/commit/c5bf9aa5bebab5d340cb3909f91a01daa25cde38

### October 2026 - Budget status and manual code

- **Tool:** ChatGPT and OpenAI Codex.
- **What I asked for:** Suggest changes I could make manually and explain category counts and the “Limit reached” condition.
- **What it gave back:** Explanations of array calculations, conditional statements and where the status appears in the interface.
- **What I kept, what I changed, and why:** I manually edited the budget-status conditions and pasted my code back for review. I added an equality case so reaching a budget would have a different message from exceeding it. I added an exact-equality check before the percentage check so spending equal to the budget would display “Limit reached” instead of “Getting close.”
- **Commit:** https://github.com/adriann47/BudgetWise/commit/c5bf9aa5bebab5d340cb3909f91a01daa25cde38

### October 8, 2026 - Database permissions and security review

- **Tool:** OpenAI Codex.
- **What I asked for:** Review security and help separate normal application access from administrator database access.
- **What it gave back:** Restricted-role setup, permission checks, security guidance, tests and checklist updates.
- **What I kept, what I changed, and why:** I kept the separation between the restricted database account used by Express and the administrator account used for migrations, so everyday app requests would not need administrator privileges. I applied the permissions in Supabase and tested that the app’s features still worked. I kept unresolved findings marked No because I wanted the documentation to reflect what was actually verified.
- **Commit:** https://github.com/adriann47/BudgetWise/commit/72e2542b78fda67e5004f77fde26e366e78fe361

### October 9, 2026 - Vercel deployment

- **Tool:** OpenAI Codex.
- **What I asked for:** Prepare BudgetWise for Vercel and guide me through deployment.
- **What it gave back:** Deployment configuration, an API handler, environment-variable support and setup instructions.
- **What I kept, what I changed, and why:** I imported the GitHub repository, entered the production configuration and deployed the app manually. When the app displayed “Let’s reconnect,” I supplied the logs and followed the certificate-configuration correction. I then verified login and access to my existing expenses, budgets and categories.
- **Commit:** https://github.com/adriann47/BudgetWise/commit/83a0ba1adc7356f703014a79475852644bf7a20f — includes deployment preparation. Production settings and browser verification were manual activities.

## 2. Where the AI got it wrong

### Case 1 - Budget status did not distinguish reaching the limit

- **What it gave me:** A budget-status display that checked for overspending and approaching the limit but did not have a separate status for spending exactly equal to the budget.
- **What was wrong with it:** Reaching the limit could still display “Getting close,” even though the entire budget had already been used.
- **What I did instead:** With AI guidance, I manually added an `item.amount === limit` condition before the percentage check. It displays “Limit reached” when spending exactly matches the budget. I pasted my edited code back for review.
- **Commit:** https://github.com/adriann47/BudgetWise/commit/c5bf9aa5bebab5d340cb3909f91a01daa25cde38

### Case 2 - Missing certificate file in the database setup

- **What it gave me:** Supabase setup guidance that configured the database connection to read a local CA certificate.
- **What was wrong with it:** The setup assumed the certificate existed at `.local/supabase-ca.crt`. When I ran `npm.cmd run db:migrate`, it failed with an ENOENT error because that file was missing. The instructions should have included verifying the certificate file before running the migration.
- **What I did instead:** I shared the terminal error and followed the corrected certificate setup. After resolving the connection setup and running the migration, I confirmed that the tables appeared in Supabase.
- **Commit:** https://github.com/adriann47/BudgetWise/commit/c5bf9aa5bebab5d340cb3909f91a01daa25cde38 — contains the Supabase setup documentation. The missing-file error and troubleshooting are recorded in the conversation; the local certificate is not committed.

### Case 3 - Budget labels needed clearer explanations

- **What it gave me:** A budget summary using labels such as “Unbudgeted spending” and “Left in the plan.”
- **What was wrong with it:** The interface did not clearly explain that unbudgeted spending means expenses in categories without a monthly limit. The remaining amount also needed clarification because it represents unused category budgets, not available cash.
- **What I did instead:** I asked what unbudgeted spending meant and requested clearer information. The update added a separate breakdown, explained that spending above an existing limit remains budgeted spending, and clarified the meaning of the remaining amount.
- **Commit:** https://github.com/adriann47/BudgetWise/commit/c5bf9aa5bebab5d340cb3909f91a01daa25cde38

## 3. Who wrote what

### Written by me

- **File:** client/src/App.jsx
- **Commit:** https://github.com/adriann47/BudgetWise/commit/c5bf9aa5bebab5d340cb3909f91a01daa25cde38
- **What it does and why it is built this way:** I manually edited the budget-status conditions, category counts and duplicate account controls with AI guidance. The budget condition uses item.amount === limit to display “Limit reached” when spending exactly matches the budget. It runs before the percentage check so a fully used budget does not display “Getting close.” The category-count calculation filters the selected month’s expenses by category and uses .length to count the matching records. I also removed the upper signed-in information and extra logout button because the Profile screen already provided those controls. These edits made the spending summaries clearer and reduced repeated information in the interface.


### The AI-written part I understand best

- **File:** client/src/api/httpApi.js and server/accountRoutes.js
- **Commit:** https://github.com/adriann47/BudgetWise/commit/c5bf9aa5bebab5d340cb3909f91a01daa25cde38
- **What it does and why we kept it:** The frontend’s createExpense function sends an expense as JSON in a POST request. The Express route validates the input, checks that the category belongs to the signed-in user, and inserts the record using SQL parameters. The user ID comes from the session. The route returns the saved expense so React can update the displayed data. We kept this structure because it separates interface work from validation and database operations.
