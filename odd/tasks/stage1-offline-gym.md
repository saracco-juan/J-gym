# J-gym Stage 1: offline-first gym use

## Objective
Make J-gym fast and reliable to use inside the gym on an iPhone with almost no signal: one-tap set logging, flexible sessions, offline-first data, installable-PWA-friendly login.

## Problem
Every read/write goes through server actions (no offline). The active session lives only in memory (lost if iOS kills the app). Logging is slow. Overload and PRs key on free-text names. Magic links open Safari, not the installed PWA.

## Why
User priority: "Usarla en el gym". Also a portfolio piece.

## Scope
- In: exercise catalog + custom exercises, session logic (one tap, statuses, skip/replace/add), migration 0002, Dexie local DB + outbox sync, reads moved to local, workout UI rework, OTP login, Serwist + offline fallback, iPhone airplane-mode check.
- Out (later stages): weight suggestions, stagnation alerts, bodyweight standards, body-weight log, history screens, routine editing/multiple routines, push reminders, passkeys, tips UI beyond catalog data, sharing, export, notes.

## Constraints
- Clean Architecture (core / infrastructure / presentation / app). Core stays pure and tested.
- No secrets in repo. Supabase dashboard changes (migration run, email template `{{ .Token }}`) are done by the user.
- Never push to main. Push, PRs and merges are the user's decisions.
- Commits: Conventional Commits, no AI attribution.

## Default decisions (approved 2026-11-08)
1. Exercises with zero targets open expanded for first input; one tap cannot log zeros.
2. Partially logged sets count as failed.
3. A replacement's performance goes to its own history only.
4. Demo button unchanged.

## Checklist
- [x] S1 Catalog (~40 exercises with tips) and new types. Route: delegated writer. TDD.
- [x] S2 Pure session logic: one tap, statuses, skip/replace/add, PR detection by id with name fallback. Route: delegated writer. TDD.
- [x] S3 Migration 0002 (custom_exercises, workout_logs updated_at/schema_version/UPDATE) + tolerant mappers. Route: delegated writer. TDD for mappers.
- [x] S4 Outbox (pure, TDD) + Dexie local DB. Route: delegated writer.
- [x] S5 SyncEngine, Providers, SyncBadge. Route: delegated writer.
- [x] S6 Dashboard and onboarding read local; remove server actions. Route: delegated writer.
- [x] S7 Workout UI rework + ExercisePicker. Route: delegated writer.
- [x] S8 OTP login — superseded: delivered by Stage 2 T7 (PR #15). Route: delegated writer.
- [x] S9 Serwist, offline page, screen cache (starts with spike; plan B: client-only screens). Route: delegated writer.
- [x] S10 iPhone airplane-mode verification. Route: user + inline.

## Acceptance criteria
- A full workout can be logged in airplane mode on the installed PWA and syncs when signal returns, without duplicates.
- Closing the app mid-session restores the session.
- One tap logs a set as planned; failure details are editable.
- OTP login works inside the installed PWA.
- lint, typecheck, jest, build pass locally and in CI.

## Checks
lint, typecheck, jest (core + pure sync), next build --webpack, browser smoke test, iPhone check (S10).

## TDD mode
On (strict, user config). Runner: jest (ts-jest, node env, roots src/core). Applies to S1, S2, S3 mappers, S4 outbox.

## Delivery
Forecast ~3000+ changed lines. Strategy: feature-branch-chain (user choice 2026-11-08). Integration branch `feature/stage1` from main; slice PRs target it; one final PR feature/stage1 -> main.
Slices: PR-A S1+S2, PR-B S3+S4, PR-C S5+S6, PR-D S7, PR-E S8, PR-F S9.

## Progress
- 2026-11-08: plan approved with default decisions; doc created.

## Evidence
- Plan: Engram topic jgym/stage1-plan.
- S1/S2 on feat/stage1-core-session: 978fa5b catalog (45 exercises), 8d79fa0 session state/reducer, f2edadc evaluate-session, ab0998e PRs by id, 0f72786 fix maintain when weight below target. RED observed per writer report (stubs, assertion failures). Parent verified: typecheck ok, lint 0 errors, jest 131/131. Diff vs feature/stage1 ~+2550 (mostly catalog data and tests).
- Writer decisions accepted: replaced row has no sets, replacement is "added" with plannedExerciseId; weight counts toward completed; replacement target weight 0 (opens expanded); not performed = skipped; only planned completed/failed feed overload; untouched added rows dropped; reduceSession returns {state, rejected}.
- Pending: user to confirm aliases "Canguro" (-> triceps-kickback?) and "Pull c/mancuerna" (-> dumbbell-row or pullover?). Persistence of new log shape is S3.
- Aliases: user said keep the guesses (2026-11-08).
- PR A: https://github.com/saracco-juan/J-gym/pull/4 (base feature/stage1), +26355d5 ci runs on PRs to feature/**. CI verify pass.
- S3/S4 on feat/stage1-local-storage: 921f856 migration 0002, 9d03236 mappers, 0755f88 outbox, 1b4472f Dexie + local repos (dexie ^4.4.7, fake-indexeddb dev; jest roots + src/infrastructure/local). RED: mappers 15/15 vs throwing stubs; outbox 13/17 vs wrong stub (impl written first, then stubbed). Dexie tests no RED. Parent verified: typecheck ok, lint 0 errors, jest 172/172. Build ok per writer.
- PR B: https://github.com/saracco-juan/J-gym/pull/5 (base feat/stage1-core-session; retarget after #4 merges; no CI on this base).
- Notes for S5: routine_templates UNIQUE(user_id, day_name) can conflict with client UUID upserts; legacy status = completed if any set logged; custom exercise hard delete locally, server soft delete via deleted_at; outbox payloads are domain objects, map with mappers before sending. 0002 not yet applied to Supabase.
- 2026-11-08: #4 and #5 merged into feature/stage1 (merge commits a3cf718, 1b0e782). User says 0002 was run ("listo todo mergeado"); to be confirmed in the sync smoke test. Slice C PR will target feature/stage1 directly.
- S5/S6 on feat/stage1-sync: 12 commits a9c6cb4..677d935 (sync rules, engine, initial pull, provider in (app) route group, SyncBadge, finalize pipeline, local queries, persisted active session, server actions + server repos removed). RED observed per writer (mostly missing-module). Parent verified: typecheck ok, lint 0 errors, jest 254/254, no attribution. PR C: https://github.com/saracco-juan/J-gym/pull/6.
- Parent-accepted defaults: same-day conflict -> re-key to server id, local content wins; log date = local calendar date; demo/fresh device needs one online start until S9; sign-out keeps unsynced data (pending user preference on warning).
- Smoke test PR #6 preview (2026-11-08) PASSED: demo sign-in, onboarding saved locally, routine synced (outbox emptied); workout sets logged, reload restored 3 logged sets from activeSession; finish -> local log (completed + 6 skipped), overload 3x12 -> 4x8, PR toast, active session cleared; Supabase REST confirmed routine (schema_version 2, 4x8) and log (ref smith-squat, status completed); custom_exercises 200 -> 0002 applied. Deleted IndexedDB + reload -> initial pull restored routine + log. CI verify pass.
- Observed (pre-existing, S7 scope): OK button disabled until reps and weight are typed (placeholders look like values). Onboarding "Revisar" silently does nothing until every field is filled (no message) -> note for later.
- Supabase project uses the new `sb_publishable_` key format.

## Next step
User picks delivery strategy; then branch from main and start S1.
- 2026-11-08: #6 merged into feature/stage1 (b20687b). S7 PR will target feature/stage1.
- S7 on feat/stage1-workout-ui: 7 commits 51fedd8..ab41b70 (display/picker helpers TDD, BottomSheet, one-tap + inline editor + undo, ExercisePicker + custom create, tips, finish confirmation). Parent verified typecheck, lint 0 errors, jest 291/291. PR D: https://github.com/saracco-juan/J-gym/pull/8 (CI pass).
- Smoke test PR #8 preview PASSED: one-tap 3 sets -> Completado; edit set to 9 reps -> Incompleto; skip; replace Gemelos via picker -> RDL opens editor (zero target), logged 12x40; finish confirmation "Sin registrar: 3"; log statuses completed/failed/skipped/replaced/added correct; overload only on completed (4x8), failed kept 3x12; outbox flushed.
- Writer open questions kept as defaults: undo = second tap on check; no explicit un-skip; actions always visible; no duplicate guard in picker; failed label "Incompleto". WeightInputModal kept (used for increase_weight).
- S8 on feat/stage1-otp-login: 6a85302 otp helpers (TDD, RED missing module), ca5b825 LoginView code flow, 4568fd3 README template docs. Parent verified jest 268/268, typecheck, lint 0 errors. PR E: https://github.com/saracco-juan/J-gym/pull/9. Pending: user adds {{ .Token }} to Magic Link template and tests with real email on the PR preview.
- 2026-11-08: S8 postponed. Supabase dashboard requires custom SMTP to edit email templates (docs did not say so). User declined SMTP for now. PR #9 closed unmerged, branch feat/stage1-otp-login kept. Magic link login remains.
- 2026-11-17: #8 merged into feature/stage1 (77cf063). User also merged #7 feature/stage1 -> main (076c1d8) BEFORE #8: production has S1-S6, not S7. Final PR to main will carry S7 + S9. Started S9 on feat/stage1-offline-shell.
- S9 on feat/stage1-offline-shell: 05d36f8 serwist, c78bd52 route caching + /~offline + AppShellWarmup, d23d92e proxy cookie check (TDD, RED missing module), ac2d72d README. Parent verified jest 314/314, typecheck, lint 0 errors, no next-pwa left. Writer verified offline in Chrome with prod build + fake cookie. PR F: https://github.com/saracco-juan/J-gym/pull/10 (CI pass).
- 2026-11-17 BLOCKER: Supabase project fvhmzfurgxbnwblllenh is NXDOMAIN (DNS gone). Keep-alive ok 11-12, failed 11-16 (curl exit 6). Preview demo fails (signup 503 / unresolved); production is down too. User must check the Supabase dashboard (paused or deleted?). Preview real-session test of #10 pending.
- 2026-11-17: Supabase was PAUSED (user resumed it); DNS returned NXDOMAIN while paused, auth 503 for a few minutes after resume. Keep-alive succeeded 11-09 and 11-12 yet the project paused before 11-16 -> the anon zero-row SELECT likely does not count as activity (unconfirmed). Follow-up: stronger keep-alive.
- Real-session preview test of #10 PASSED: demo -> onboarding -> dashboard; SW controls page; app-pages and app-rsc hold /dashboard, /workout, /onboarding; /~offline precached. Found Supabase REST responses in the cross-origin cache -> fixed 206c21e (NetworkOnly for *.supabase.co); verified 0 Supabase entries after SW update; SW update across deploys worked. CI pass. Real offline (airplane mode) still only verified by writer in desktop Chrome; iPhone = S10.
- 2026-11-17: #10 merged into feature/stage1 (5179e36). Final PR feature/stage1 -> main: https://github.com/saracco-juan/J-gym/pull/11 (CI pass). Next: user merges, then S10 iPhone airplane test on production.
- 2026-11-17: #11 merged to main (0e223e3). Production deploy success: /~offline 200, sw.js has Supabase bypass. CI on main checked. Next: S10 iPhone airplane test (user).
- 2026-11-17: S10 PASSED on user's iPhone (installed PWA, airplane mode, sets persisted, sync after signal). Stage 1 closed except S8 (postponed, needs SMTP). Follow-up: stronger keep-alive.
