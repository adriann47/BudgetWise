# BudgetWise Security Checklist

Review date: October 7, 2026; database follow-up: October 8, 2026; targeted No-item recheck: October 9, 2026. Scope: the CURRENT local working files and configured Supabase database, not the historical pre-Supabase Week 2 checkpoint.

This is an evidence-based draft prepared with AI assistance. Review and express the evidence in your own words before submitting it. No means either a confirmed gap or an unverified required check; the evidence explains which. Yes reflects the checks performed, not a guarantee that no vulnerability exists. The original review made no changes. The October 8 follow-up records the runtime-role and database-permission fixes applied by the student; The October 9 review revisits the nine previously No rows; other rows retain their earlier evidence.

The original October 7 history review inspected local HEAD e81a922. October 9 checks covered current local files, local Git email metadata, the supplied GitHub run logs/artifact at 83a0ba1, account-setting screenshots and the BudgetWise Figma page. They do not constitute a new full security audit or a review of remote-only history.

At the student's request, N/A rows 5, 6, 8, 20 and 22 are preserved verbatim and were not rechecked. Row 6 contains an outdated pre-deployment explanation: the app is now deployed on Vercel. Preserving that row is not confirmation that it remains inapplicable.

## Secrets and credentials

| # | Check | Yes / No / N/A | Evidence |
| --- | --- | --- | --- |
| 1 | `.env` is gitignored and is not in the repository | Yes | The root .gitignore excludes .env, .env.* and .local/. git ls-files lists only .env.example files, not private environment files. |
| 2 | A `.env.example` with placeholder values only is committed | Yes | Root, client and server .env.example files are tracked and contain placeholders/public settings. |
| 3 | No connection string, key, token or password is hardcoded in source, comments or commented-out code | Yes | Reviewed 50 working source/config/documentation files and secret-pattern candidates; no live hardcoded credentials found. Example URLs and fictional test passwords are intentional. |
| 4 | Git history is clean: I searched `git log -p` for password, secret, api key and `postgres://` | Yes | Searched local git log --all -p for password, secret, API key and PostgreSQL URLs. URL candidates were placeholders; no current secrets or private .env/.local paths appeared. Remote-only history remains unverified. |
| 5 | Any credential that was ever committed has been rotated | N/A | No committed live credential was identified in the inspected local history, so no rotation was performed in this review. |
| 6 | Production credentials live only in my hosting provider's environment settings | N/A | No production app host yet; development Supabase credentials remain in private server/.env. |

## GitHub Actions

If your project has no workflows, mark every row N/A and say so once.

| # | Check | Yes / No / N/A | Evidence |
| --- | --- | --- | --- |
| 7 | No secret value is written literally in any workflow YAML file | Yes | Reviewed .github/workflows/deploy-pages.yml; it uses public VITE variables and contains no literal secret values. |
| 8 | Secrets are stored in repository Actions secrets and read with `${{ secrets.NAME }}` | N/A | The Pages workflow needs no custom app secrets; VITE inputs are public variables and deployment uses GitHub-managed permissions. |
| 9 | No workflow step echoes, dumps or debug-prints a secret, and I opened a recent run's log to confirm | Yes | October 9: inspected both files in logs_102663532692.zip for the recent build at commit 83a0ba1. Tokens and authorization values are masked. Printed environment values are public build settings. No exposed credential patterns or matches for three current local secret values were found. |
| 10 | Uploaded build artifacts contain no `.env`, key file or generated config | Yes | October 9: inspected github-pages.zip and its artifact.tar. It contains index.html, 404.html, one JavaScript bundle and one CSS file. No private environment/configuration files, keys, PostgreSQL URLs or matches for three current local secret values were found. |
| 11 | Third-party actions are pinned to a commit SHA, not a moveable tag | Yes | October 9: all four direct action references in the local workflow are pinned to full 40-character commit SHAs verified against official actions repositories. This confirms the local change; its commit, push and a new Actions run remain pending. Dependencies inside those actions were not independently pinned by this change. |
| 12 | Secret scanning and push protection are enabled on the repository | No | October 9: the supplied private-repository Advanced Security screenshot does not list secret scanning or push protection, so enablement remains unverified. Dependency graph, Dependabot alerts and security updates are Off; those are separate features. |

## Database

| # | Check | Yes / No / N/A | Evidence |
| --- | --- | --- | --- |
| 13 | Every query taking user input uses parameters, never string concatenation | Yes | Express queries bind user values with $1-style parameters. Dynamic SQL fragments are fixed application choices, not concatenated user values. |
| 14 | The database is not open to the whole internet, or is reachable only by the app | No | October 9: the Supabase Network Restrictions screenshot confirms all IP addresses can connect. Vercel uses dynamic outbound IPs on the current setup, so no allowlist was applied and the hosting move was cancelled. Database credentials, verified TLS and a restricted runtime role remain separate protections. |
| 15 | The database user the app connects as has only the permissions it needs | Yes | October 8: the configured runtime connection is budgetwise_app, with no superuser, CREATE ROLE, CREATE DATABASE or BYPASSRLS flags. Explicit application grants preserve required operations; restricted-role tests verify schema changes, truncation and role creation are denied. Admin credentials are kept for migration/test tools. |
| 16 | Seed and sample data is invented, not real people's data | Yes | Seed expenses and example.test integration accounts are fictional; automated tests use a disposable schema. |
| 17 | Debug, seed and reset routes are removed before going public | Yes | The current Express route definitions expose no database reset, seed or debug endpoint; migrations and test setup are command-line tools. |

## Access control

| # | Check | Yes / No / N/A | Evidence |
| --- | --- | --- | --- |
| 18 | The app has an access layer: Cloudflare Zero Trust, an app-level password, or a real login | Yes | Express provides registration, password hashing, session login and logout; authentication and account-isolation tests passed on October 7, 2026. |
| 19 | If Supabase or Firebase: Row Level Security or security rules are on, and I tested it signed out | Yes | October 8: all six tables have RLS. The student supplied query results showing anon/authenticated lack SELECT/INSERT/UPDATE/DELETE table permissions. Automated tests verify those restrictions and signed-out Express access returning 401. This does not claim a live signed-out Data API HTTP test; the dashboard disabled setting remains unverified. |
| 20 | If Zero Trust: tjakoen.s@gmail.com is on the access policy. If an app password: the credentials are in my private workspace `project/README.md` | N/A | BudgetWise uses individual app accounts, not Cloudflare Zero Trust or a shared app password. |
| 21 | The gate covers every route, including the ones that only change data | Yes | Financial, category and profile routes follow session/ownership checks; mutations require Origin and CSRF checks. Public auth/health routes are intentional. |
| 22 | The credentials for the gate are environment variables, not in source | N/A | There is no shared gate password. Individual passwords are hashed in PostgreSQL; SESSION_SECRET and database credentials come from private environment configuration. |

## Input and output

| # | Check | Yes / No / N/A | Evidence |
| --- | --- | --- | --- |
| 23 | Input from the user is validated on the server, not only in the browser | Yes | server/validation.js and accountRoutes.js validate names, emails, passwords, amounts, dates, months and category ownership on the server. |
| 24 | User-supplied text is escaped when rendered, so it cannot inject markup or script | Yes | React JSX renders user text; no dangerouslySetInnerHTML, eval or innerHTML assignments were found in the working source scan. |
| 25 | Error responses do not expose stack traces, file paths or connection details | Yes | Express returns generic server errors, sanitizes malformed JSON errors and does not send stacks or connection details; detailed startup failures remain terminal-only. |
| 26 | CORS is not a wildcard on routes that change data | Yes | CORS and mutation middleware require configured exact origins, not a wildcard. |

## Repository and privacy

| # | Check | Yes / No / N/A | Evidence |
| --- | --- | --- | --- |
| 27 | No student number, personal email, phone number or home address in the repository or in commit messages | No | October 9: older Git author/committer metadata still contains a personal email. The repository-local user.email is now verified as a GitHub noreply address for future commits; GitHub email privacy is enabled. Published history was not rewritten. |
| 28 | No classmate's personal data in the repository | Yes | October 9: no apparent classmate personal data was found in the inspected tracked text and both tracked screenshots. The screenshots show BudgetWise demo screens with fictional sample expenses. This records the inspected repository scope, not private database contents. |
| 29 | Dependencies come from official registries, and `node_modules` is gitignored | Yes | Both lockfiles resolve dependencies through registry.npmjs.org, and node_modules/ is gitignored. A separate dependency vulnerability finding is recorded below. |
| 30 | Images, fonts and other assets are mine, licensed, or credited | No | October 9: README asset credits are present and LICENSE names the project author. DM Sans and Manrope licenses were verified as SIL OFL 1.1. App screenshots show demo data. Figma Page 3 uses text-symbol navigation icons, which do not establish the source of the app SVG paths. SVG provenance remains unverified; replacement was deferred. |
| 31 | Repository visibility is deliberate, and I checked it after my last push | Yes | October 9: after the latest reported push, the supplied GitHub screenshot shows the repository lock and the run at 83a0ba1; its downloaded log records IS_PRIVATE=true. Keeping the repository private is the chosen setting. Pending local changes have not yet been pushed. |

## Anything I found and fixed

The student applied the restricted runtime-role setup and manually ran the RLS/grant SQL in Supabase. The verification screenshot matched all six expected rows; the student then reported successful login/logout, expenses, budgets, category and registration testing. The follow-up code makes those permissions repeatable through migrations and runtime setup.

October 9: inspected the downloaded Actions logs and artifact, confirmed local workflow pins, verified the noreply Git email configuration, and checked README asset credits. Remaining No rows are 12 (GitHub protection enablement), 14 (network allowlist), 27 (historical email exposure) and 30 (SVG provenance). The checklist is not an assurance that all security issues are resolved.

## Additional dependency and connection checks

- Server: installed proxy-addr 2.0.8 was confirmed on October 8. The earlier prepared lockfile fix passed its backend audit/tests; a new full dependency audit was not performed in this documentation follow-up. Reference: https://github.com/advisories/GHSA-jqcg-44mw-7w3h
- Client production dependency audit: zero reported vulnerabilities; this does not cover every development dependency or unknown vulnerabilities.
- Client-to-Supabase-pooler TLS: encrypted=true and authorized=true. The separate database-side pg_stat_ssl result concerns the pooler-to-database leg and was not used to infer client encryption.
- Earlier checks in this session: 11 reported backend tests and two mock-storage tests passed. The user reports successful browser/mobile verification.

## Remaining follow-up after deployment

1. Commit and push the local workflow/documentation changes, then inspect the new Actions run. Historical logs reviewed here predate the action pins.
2. Keep rows 12, 14, 27 and 30 as No until their specific gaps are resolved; no hosting migration, history rewrite or icon replacement was performed.
3. Revisit preserved N/A row 6 in a separate deployment review. Other earlier Yes rows were not comprehensively retested in this targeted recheck.
4. Existing deployment verification is based on the student's successful login and data-persistence reports; the current recheck did not repeat live account-isolation testing.

## October 8 follow-up validation

The updated integration suite passed all 13 reported tests with a restricted Supabase login in a disposable schema. It simulates the old grants, verifies their removal and future table/sequence defaults, checks repeat application, and exercises authentication, isolation, expenses, budgets, categories and profile updates. Test records and the temporary role were removed by the suite.
