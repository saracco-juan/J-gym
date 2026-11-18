# Week swap with rest days

Branch `feat/week-swap-rest-days` from main 7c3a1d1. Strict TDD on pure core logic (runner `npm test`). Follows `odd/tasks/week-day-swap.md` (PR #22).

## Objective
Allow swapping a training day with a rest day for the current week (routine Mon/Tue/Thu, Tuesday's routine on Friday), with stats reading the effective per-date schedule and overrides synced to Supabase.

## Why
v1 blocked training<->rest because streak and full-week achievements read the schedule by weekday: the moved day would count as missed. The coming Consistency board measures exactly this, and every device must compute the same value.

## Scope and constraints
- Allow training<->rest; keep blocking rest<->rest ("rest-day" now means both rest). Past, logged, other-week, session-in-progress rules unchanged.
- Stats: `scheduleFor(templates, overrides)` predicate used by streak and achievements; `computeUserStats` takes overrides; publish after swap/reset.
- Keep override history (no purge of earlier weeks).
- Sync: Supabase table `day_overrides` PK (user_id, date), upsert onConflict "user_id,date", new delete-by-date command, outbox entity id = `<userId>:<date>` (see T3 log), initial pull within the 120-day window.
- Migration `0007_day_overrides.sql` must be run by the owner before production gets the merge.
- AGENTS.md rules (pure core, repository pattern, <200-line components, never suggest weight).

## Tasks
- [x] T1 Core swap + stats rules (RED/GREEN). Route: delegated writer.
- [x] T2 Core sync entity, commands, mapper (RED/GREEN). Route: same writer.
- [x] T3 Infra: replaceWeek keeps history and enqueues, transport, pull, applyPull, publishStats. Route: same writer.
- [x] T4 Migration 0007 + UI (rest targets, copy, publish request). Route: same writer.
- [x] T5 Docs: README migrations + sync note, this log. Route: same writer.

## Acceptance
- Swap Tue<->Fri: Tuesday shows rest, Friday shows Tuesday's routine; training Friday keeps the streak and the full week.
- Rest<->rest still blocked.
- Override edits reach Supabase (upsert/delete) and a fresh device pulls them.
- Earlier weeks' overrides survive new swaps.

## Checks
`npm run typecheck`, `npm run lint`, `npm test`; owner check on the Vercel preview after running 0007.

## Log
- 2026-11-17: plan approved. Branch created.
- 2026-11-17: T1 RED `npx jest src/core/schedule src/core/stats`: 5 suites failed, 9 tests failed / 131 passed (scheduleFor missing, overrides ignored, training<->rest blocked). GREEN: 11 suites, 140 tests passed; tsc and eslint clean.
- 2026-11-17: T2 RED `npx jest src/core/sync src/core/mappers`: 3 suites failed (mapper module missing), 3 tests failed / 85 passed. GREEN `npx jest src/core`: 49 suites, 609 tests passed; tsc and eslint clean.
- 2026-11-17: T3 `npx jest src/core src/infrastructure`: 63 suites, 775 tests passed; tsc and eslint clean. Deviations: the outbox entity id is `<userId>:<date>` (`dayOverrideEntityId`) instead of the bare date, because two accounts with pending swaps of the same date on one device coalesced into one entry and lost a write (the delete command reads the date from its payload); `clearUser` (data reset) now queues server deletes like the other entities; the override fetch of the initial pull is best effort like the profile, so a server without 0007 does not block the pull. Dexie keeps v3 (same key), only the comments changed.
- 2026-11-17: T4 migration `0007_day_overrides.sql` written (idempotent, RLS per user, GRANT to authenticated; not run against a database). UI: rest days become valid swap targets through `swapBlock`; `rest-day` copy is "Los dos días son de descanso"; `useWeekSwap` requests a stats publish after an applied swap or reset. tsc and eslint clean; UI not checked in a browser.
- 2026-11-17: T5 README: 0007 row in the migration table, run-before-deploy note, swap feature and data reset text updated.
- 2026-11-17: Commits: T1 99acacd `feat(stats): honor week overrides in the schedule`; T2 72b22f0 `feat(sync): add day override entity`; T3 a88ea32 `feat(local): sync week overrides and keep their history`; T4 0ac7134 `feat(routine): allow swapping with rest days`; T5 `docs: document rest day swaps and migration 0007` (this commit).
- 2026-11-17: Final checks: `npm run typecheck` clean, `npm run lint` clean, `npm test` 63 suites / 775 tests passed. Pending: owner runs 0007 in Supabase and checks the Vercel preview (swap Tue<->Fri, train Friday, streak kept, two rows in `day_overrides`, reset removes them).

## Next step
Owner runs `supabase/migrations/0007_day_overrides.sql`, then verifies on the preview before merging.
