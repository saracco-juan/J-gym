# J-gym Stage 2: routine control, progress insights and leaderboard

## Objective
Let the user shape their routine, see their progress per exercise, get warned when stuck, and compete with other users on a shared leaderboard. Keep Supabase from pausing.

## Problem
- The onboarding seed routine is not the user's routine.
- A finished day still offers "Empezar Rutina", so a completed workout can be started again.
- The routine cannot be edited after onboarding.
- There is no history per exercise and no stagnation signal.
- Only the demo and magic link exist; without custom SMTP, other people cannot sign up, so a multi-user leaderboard is impossible.
- The keep-alive ping did not stop the free Supabase project from pausing.

## Why
User requests (2026-11-17): new default routine, lock completed day, routine editing, history (suggestion 2), stagnation alert (suggestion 3), leaderboard to gamify the app. Rest timer (suggestion 1) declined. Activity feed declined.

## Scope
- In: keep-alive, seed routine, completed-day lock, routine editor, exercise history chart, stagnation detection, SMTP + OTP login with demo removed, profiles (display name + avatar color), stats engine, stats publishing, leaderboard screen.
- Out: rest timer, activity feed, friends/leagues, push reminders, weight suggestions beyond stagnation, anti-cheat.

## Decisions
- Seed routine (weights 0, user enters own): Mon Cardio 1x1; Tue Legs: Sentadilla 3x8, Cuadriceps 3x10, Isquios 3x10, Gemelos 3x15, Prensa 3x8; Wed Chest/Shoulders: Press banca, Press inclinado en smith, Aperturas, Press militar con maquina, Vuelo lateral con polea, all 4x10; Thu Back/Shoulders: Dorsalera, Remo, Rear delt, Press militar con mancuerna, Vuelos laterales con mancuerna, all 4x8. The user's own stored routine is changed with the routine editor, not by the seed.
- Login: Gmail SMTP (app password) configured by the user in Supabase + OTP code login (reuse branch feat/stage1-otp-login). Demo sign-in removed.
- Leaderboard: every user sees every user. Profile = display name + avatar color.
  - Card: streak (consecutive scheduled training days done; rest days do not break it), level (XP per logged set), best lifts (main exercises), status (progressing: weight up this month / stagnant: same exercise failed 3 sessions in a row / inactive: 7+ days without training), achievements.
  - Ranking tabs: streak, weekly volume (kg), monthly progress (% over own marks).
  - Achievements: first full week, 10 workouts, 4 weeks without missing, plateau breaker.
  - Each client computes its stats from local data and upserts a public snapshot; everyone can read snapshots. Offline shows the last cached leaderboard. Self-reported numbers accepted (friends group).

## Checklist
- [x] T1 Stronger keep-alive (research what counts as activity first). Route: inline.
- [x] T2 New seed routine. Route: inline. TDD.
- [x] T3 Lock completed day (show log + disabled "Entrenamiento completado"). Route: delegated writer. TDD for the pure day-state rule.
- [x] T4 Routine editor (days, exercises via ExercisePicker, sets/reps/weight). Route: delegated writer.
- [x] T5 Exercise history screen with a progress chart. Route: delegated writer.
- [x] T6 Stagnation detection (pure) + alert in workout/dashboard. Route: delegated writer. TDD.
- [x] T7 SMTP + OTP login, remove demo. Route: user (SMTP) + delegated writer.
- [x] T8 Migration 0004: profiles with RLS (public_stats moved to T10); profile setup screen. Route: delegated writer.
- [x] T9 Stats engine (pure): streak, XP/level, best lifts, status, weekly volume, monthly progress, achievements. Route: delegated writer. TDD.
- [x] T10 Publish stats snapshot + leaderboard screen with tabs. Route: delegated writer.
- [x] T11 Visual redesign with the landing-page-design skill (Part B), emerald accent kept. Runs before slice 2 so new screens use it. Route: delegated writer.

## Acceptance criteria
- New users get the agreed seed routine.
- After finishing today's workout, the dashboard shows the log and cannot start it again.
- The routine can be edited and changes sync.
- Each exercise shows its history chart; stagnant exercises are flagged.
- A new person can sign up with an emailed code inside the installed PWA; no demo button.
- The leaderboard lists every user with streak, level, best lifts, status and achievements, sortable by the three tabs.
- lint, typecheck, jest, build pass locally and in CI.

## Checks
lint, typecheck, jest, next build --webpack, browser smoke test on preview, iPhone check for login and leaderboard.

## TDD mode
On (strict, user config). Runner: jest (ts-jest). Applies to pure core logic: T2, T3, T6, T9.

## Delivery
Forecast ~3500 changed lines. Strategy: feature-branch-chain (user choice 2026-11-17). Integration branch feature/stage2; slices: 1 = T1-T3, 2 = T4-T6, 3 = T7-T8, 4 = T9-T10; final PR feature/stage2 -> main.

## Progress
- 2026-11-17: scope agreed with the user; doc created.

## Evidence

## Next step (handoff, 2026-11-17)
All tasks T1-T11 are implemented and merged into feature/stage2. Final PR feature/stage2 -> main: https://github.com/saracco-juan/J-gym/pull/17 (CI green).
1. User merges #17; then verify production (https://juangym.vercel.app): login without demo, /~offline 200, /leaderboard, keep-alive cron on main.
2. User configures Gmail SMTP in Supabase + templates Magic Link and Change Email Address with {{ .Token }}.
3. Test code login with a new account on production or preview; create a profile; check the leaderboard shows it.
4. User links their email on the iPhone (they are an anonymous demo user with real data; same user id keeps data), creates a profile.
5. Only then: disable anonymous sign-ins in Supabase.
Follow-ups: fresh-device snapshot regression (120-day initial pull can publish lower XP/achievements); intermittent jest failure (seen twice right after typecheck+lint, never reproduced); UserProfile.tsx at 220 lines; S8 OTP from Stage 1 is superseded by T7.
Project rules: AGENTS.md rule 1 (never suggest kilos). Commits without AI attribution. Strict TDD on core. Design rules: landing-page-design skill Part B (install: npx skills add elayadesign/ai-design-skills --skill landing-page-design -g).

## Log
- 2026-11-17: slice 1 on feat/stage2-routine-basics: 3cd8494 keep-alive heartbeat (T1, migration 0003 pending user run), b594dbd seed routine (T2, RED 10 assertions), 1af7520 completed-day lock (T3, RED missing module + infra). Parent verified typecheck, lint 0 errors, jest 345/345 (1 flaky failure in 10 runs, not reproduced). PR: https://github.com/saracco-juan/J-gym/pull/12. Pending: preview smoke test.
- Preview smoke test PR #12 PASSED: onboarding shows the 4 seed days in order with sets/reps; finishing today's workout shows the log + disabled 'Entrenamiento completado'; /workout shows empty state. Fixed stale onboarding card text and '0kg' in template summary (commit above). Noted: sets 2-3 show 'Sin objetivo' when target weight is 0 (Stage 1 behavior).
- 2026-11-17: #12 merged into feature/stage2. User installed skill elayadesign/ai-design-skills (landing-page-design, figma-designer in ~/.claude/skills) and asked for a visual redesign; accent stays emerald. T11 added, slice R on feat/stage2-redesign before slice 2. Part A (landing strategy), B5 hero, B10 legal/cookies and B11 tagline reveal do not apply to an app and are skipped.
- T11 on feat/stage2-redesign: 64a51f0..80a4508 (7 commits: tokens + text styles, Phosphor, login/offline/sheet/badge, dashboard skeleton, workout, onboarding, link states) + fdb997f fix planned reps without weight (TDD, RED 4 failures). Parent verified typecheck, lint 0 errors, jest 349/349, build. Preview checked at 390px via iframes (login, onboarding, dashboard, workout; no overflow).
- 2026-11-17: #13 merged into feature/stage2. User ran 0003; keep-alive workflow on feature/stage2 wrote the heartbeat (RPC 200, run 44157339020). Note: the scheduled run uses main's workflow file until feature/stage2 reaches main. Next: slice 2 (T4-T6).
- Slice 2 on feat/stage2-progress: 1889457..04228a2 (10 commits, T6 stagnation, T5 history /history?ref=, T4 editor /routine). RED per writer: missing modules + real assertion failures (PR tie rule, empty series). Parent verified typecheck, lint 0 errors, jest 443/443. No migration needed (delete policy exists in 0001). Preview smoke PASSED: editor saved Sentadilla 60kg; seeded 3 failed sessions -> 'Estancado' on dashboard and history, chart + record + sessions render at 390px. OPEN: AGENTS.md rule 1 forbids suggesting kilos; stagnation suggests 60->55kg. Waiting on user decision. Copy 'Prueba' should be voseo 'Probá'.
- User chose 'Sin sugerir kilos' (keep AGENTS.md rule 1). Fixed in the commit above: STAGNATION_MESSAGE constant, suggestion helpers removed (TDD, RED: STAGNATION_MESSAGE undefined). jest 436/436.
- 2026-11-17: #14 merged into feature/stage2. Slice 3 (T7-T8) on feat/stage2-auth-profiles.
- User logs in with the demo (anonymous account with real data). T7 adds a 'link email' flow (updateUser email + code) so the same user id keeps all data; anonymous sign-ins are disabled in Supabase only after linking. Writer delegated for T7-T8.
- Slice 3 on feat/stage2-auth-profiles: 6b11926..c7375fc (10 commits). RED per writer: missing modules for otp/account-link/profile, 25 failing sync tests. Parent verified typecheck, lint 0 errors, jest 501 (1 flaky failure on a run right after typecheck+lint, not reproduced in 5 reruns incl. cold cache). Not browser-tested: needs SMTP; linking only possible on production (owner's anon session origin). User steps: run 0004 before prod, SMTP, Magic Link + Change Email templates with {{ .Token }}, disable anonymous sign-ins only after linking. Follow-up: hunt flaky jest test.
- 2026-11-17: user ran 0004 and merged #15 into feature/stage2. Slice 4 (T9-T10) on feat/stage2-leaderboard.
- Slice 4 on feat/stage2-leaderboard (T9-T10). T9 stats engine in src/core/stats (RED: missing modules per file, plus a real failure for STATUS_LABELS and one for the plateau rule). T10: migration 0005_public_stats.sql (user must run it), outbox entity stats (coalesced, sent after the profile, a refused snapshot is dropped, never pauses the queue), mapper, local snapshot in meta, triggers (workout, routine edit, profile save, app start when older than today), core/leaderboard (join, stale week and month to 0, ties share position), infra load with cache, /leaderboard screen, trophy button and menu item. Parent still has to verify in a browser against Supabase after running 0005.
- Slice 4 on feat/stage2-leaderboard: fc009d1..41d6699 (15 commits). RED: missing modules + real failures (STATUS_LABELS, plateau-breaker rule, 5 sync, 2 route-access, 9 infra). Parent verified typecheck, lint 0 errors, jest 675/675; reviewed 0005 RLS. User must run 0005. Follow-ups: fresh-device snapshot regression (120-day pull), flaky jest test, UserProfile.tsx 220 lines.
- 2026-11-17: user ran 0005 and merged #16. Final PR feature/stage2 -> main: https://github.com/saracco-juan/J-gym/pull/17 (CI pass, 190 files). Next: user merges; verify prod; user sets SMTP + templates, links email on iPhone, creates profile, then disables anonymous sign-ins.
- 2026-11-17: #17 merged into main (6abe207). Production verified: deploy success, /login without demo, /~offline 200, /leaderboard 307 to login without session. odd/ committed to the repo for handoff (see odd/NEXT.md).
- 2026-11-17: owner signed out of the anonymous account (sign-out hung, no warning). Data stays on server under the old anon user id; recover by moving rows to the new email user via SQL once they sign in. Fix PR: https://github.com/saracco-juan/J-gym/pull/19 (98e8ce7, 3663133, 68d82bc; jest 687/687, CI pass). Code email: new users get the 'Confirm signup' template, so it also needs {{ .Token }} (inferred, docs only mention Magic Link).
- 2026-11-17: #19 (sign-out fix) merged. Account delete + reset data on feat/account-delete-reset (see odd/tasks/account-delete-reset.md); needs migration 0006.
