# J-gym: complete and deploy

## Objective
Leave J-gym complete, clean and publicly usable at https://juangym.vercel.app, as a portfolio piece.

## Problem
The site returns 200 but its Supabase project no longer exists (DNS NXDOMAIN on 2026-11-05), so login and data are broken. The repo also ships debug UI in production, half-built push notifications, generated PWA files, no CI, 2 tests and the stock create-next-app README. Recruiters have no quick way to try the app.

## Why
A portfolio link that cannot log in hurts more than no link.

## Scope
- In: DB migration, cleanup of dead/debug code, removal of push scaffolding, anonymous demo login, CI, a few unit tests, README, redeploy with smoke test, keep-alive ping.
- Out: implementing push notifications, Google OAuth (until new credentials exist), UI redesign, rewriting next-pwa.

## Constraints
- Light refactor, no rewrite. Keep Clean Architecture layering (core / infrastructure / presentation).
- No secrets in the repo. Supabase project creation and Vercel env vars are done by the user.
- Branch `chore/complete-and-deploy`, single PR to `main`. Push and merge are the user's decisions.

## Checklist
- [x] T1 DB: consolidate `supabase_schema.sql` + `rls_policies.sql` into idempotent `supabase/migrations/0001_init.sql`, add `workout_logs` DELETE policy. Route: delegated writer (with T3/T4, 2+ non-trivial files).
- [x] T3 Cleanup: remove `NotificationDiag` and debug logs, reset action dev-only, delete unused `supabaseClient.ts` and boilerplate SVGs, gitignore generated PWA files, rename `middleware.ts` to `proxy.ts`. Route: same writer.
- [x] T4 Remove push scaffolding (`NotificationService`, `notificationActions`, worker push handler), note it as future work. Route: same writer.
- [x] T2 Demo: "Try demo" button using Supabase anonymous sign-in; drop the Google button. Route: delegated writer (UI + auth action).
- [x] T5 Quality: `.env.example`, `typecheck` script, GitHub Actions CI (lint, typecheck, test, build), unit tests for personal-best detection and default routines. Route: delegated writer, TDD.
- [x] T6 README in English. Route: inline (single file).
- [x] T7 Deploy: user creates Supabase project, runs migration, enables email + anonymous auth, sets Vercel env vars; redeploy; browser smoke test; weekly keep-alive workflow. Route: inline + user.

## Acceptance criteria
- Demo login works on the production URL; onboarding and a full workout can be completed and persist.
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` pass locally and in CI.
- No debug UI or console.log in production code; no generated files tracked.
- README has stack, features, architecture, how to run, live link, screenshots.

## Checks
lint, typecheck, jest, next build (webpack), browser smoke test on production.

## TDD mode
On (strict TDD enabled in user config). Runner: jest (ts-jest, node env, roots src/core). Applies to T5 tests and any core logic change.

## Delivery
Forecast ~450 changed lines (mostly deletions and config). Strategy: single-pr (approved by user: one PR to main).

## Progress
- 2026-11-07: branch created, doc created.
- 2026-11-07: T1, T3, T4 done (delegated writer). Verified by parent.
- Found: logged-out `/` shows create-next-app boilerplate (src/app/page.tsx). Folded into T2: redirect `/` to `/login`.

## Evidence
- Baseline: jest 10/10, tsc ok, lint 3 errors / 98 warnings.
- After T1/T3/T4: tsc ok, jest 10/10, lint 0 errors / 1 warning (`<img>` in UserProfile), `next build --webpack` ok with dummy env (writer report). Proxy: Next 16.1.6 has PROXY_FILENAME='proxy'.
- Commits: fff6639 (T1), f9e9e05, 83b13e3, 637df56, d2228c1 (T3), 4ac48fe (T4). 23 files, +102/-519.

- T2: e061fb4 (`/` -> /login), 5292f1b (anonymous demo, getUserDisplay in core with RED->GREEN), c19aff7 (Google removed). tsc ok, jest 13/13, build ok (writer). Anonymous sign-in relies on Supabase's built-in per-IP rate limit; no CAPTCHA.

- T5: 169d332 (env example, typecheck), b14a8f9 (CI), 1c925fc (detect-personal-records extracted to core, RED->GREEN, 6 tests), 6abc51f (default routine characterization, 8 tests, no RED by design). typecheck ok, jest 27/27 (verified by parent). `<img>` warning kept: remote avatar needs remotePatterns.

- T6: 21b2aa2 README in English (overload table checked against standard-hypertrophy.strategy.ts).
- T7 partial: 54354d9 keep-alive workflow (Mon/Thu 12:00 UTC). Note: GitHub disables scheduled workflows after 60 days without repo activity.
- PR opened: https://github.com/saracco-juan/J-gym/pull/2 (branch pushed with user's prior authorization to open one PR per project). Total diff: ~1180 lines, mostly deletions; single-pr as approved.

- 2026-11-08 smoke test #1 failed: preview built before env vars (old host). Rebuilt via empty commit (preview juan-ak38mnyfb). Demo then hit new project fvhmzfurgxbnwblllenh but /auth/v1/signup returned 401: the anon key in Vercel is still the OLD project's (JWT ref = tnvbjqvcjouvocqouino). Leftover VAPID_PRIVATE_KEY env var in Vercel to delete.

- Smoke test #2 (preview juan-fuvxqgd2u): demo sign-in OK, onboarding steps 1-4 OK, save failed "Error al crear los templates de rutina." REST shows PGRST205: tables missing, migration not applied. Added explicit GRANTs to the migration (c059ecd).

- Smoke test #3 (preview juan-fuvxqgd2u) PASSED: demo sign-in, onboarding save, dashboard, full workout, overload 3x12 -> 4x8 persisted, PR badge 22.5 kg on next session. Screenshots via same-origin 390px iframe (Chrome window maximized): 5194ce3. PR body updated.

- 2026-11-08: PR #2 squash-merged (4f376d6). Production deploy success; `/` -> 307 /login; demo sign-in on production reaches onboarding.
- Keep-alive run 42499845521 FAILED: secrets exist but the step sees one empty/wrong (error text masked, suggesting a secret value literally "SUPABASE_URL"). Claude may not write secrets (auto-mode denied); user must re-enter both.
- Minor UX bug found: while the demo sign-in is loading, the magic-link button also shows "Enviando..." (shared loading state).

- 2026-11-08: secrets re-entered by user; keep-alive run 42500138463 success, "Supabase responded 200". T7 closed. Feature complete.

## Next step
Done. Optional follow-up: fix shared loading state on the login buttons. Next project: BuenasLecturas. Earlier: User merges PR #2 (squash suggested). Then: verify production juangym.vercel.app, run keep-alive via workflow_dispatch (needs workflow on main), close T7. Earlier: User runs supabase/migrations/0001_init.sql in the SQL editor; then resume smoke test (onboarding save, workout). Earlier: user fixes NEXT_PUBLIC_SUPABASE_ANON_KEY (and GitHub secret SUPABASE_ANON_KEY) with the new project's key; then rebuild + smoke test. Previously: Supabase project + migration + auth settings, Vercel env vars (Prod + Preview), repo secrets. Then smoke test on the PR preview, screenshots, merge (user).
