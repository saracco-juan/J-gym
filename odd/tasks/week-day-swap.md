# Week day swap

Branch `feat/week-day-swap`. Strict TDD on pure core logic (runner `npm test`).

## Objective
Let the owner swap two routine days of the current week from `/routine`, so the dashboard shows the routine they actually train that day (e.g. Legs on Monday, Cardio on Tuesday).

## Why
Each date shows the routine of its weekday (`loadDayData`, `src/infrastructure/local/queries.ts`). Training in a different order one week had no way to be recorded.

## Scope and constraints
- Current week only (Monday to Sunday); next week returns to normal by itself.
- Allowed: two days of this week, both today or later, neither logged, both training days (non-empty routine). Training day with rest day is out (streak reads the schedule by weekday).
- A swap that touches today is blocked while a workout session is active.
- Local only: Dexie table, no sync, no Supabase migration. Logs already store `templateId` apart from `date`.
- Overrides store a weekday name, not a template id (ids can migrate).
- AGENTS.md: pure logic in `src/core`, UI never touches Supabase, components under 200 lines, never suggest weight.

## Tasks
- [x] T1 Core `src/core/schedule/week-swap.ts`: `currentWeekDates`, `effectiveDayName`, `swapBlock`, `applySwap`. RED then GREEN. Route: delegated writer (multi-file feature).
- [x] T2 Infra: Dexie v3 `dayOverrides` table, `dayOverrides` repo, `loadDayData` honors overrides, `loadWeekPlan`, `swapDays`, reset of the week; `sync.clearAll` and reset data empty the table. Tests in queries tests. Route: same writer.
- [x] T3 UI: "Esta semana" panel on `/routine` (`WeekSwapPanel.tsx`, `useWeekSwap.ts`, swap sheet), blocked reasons, "Restablecer semana", "Intercambiado" tag on the dashboard. Route: same writer.
- [x] T4 Docs: README section and this log. Route: same writer.

## Acceptance
- Swapping Monday and Tuesday shows Tuesday's routine on Monday and vice versa; swapping back clears overrides.
- Finishing a swapped workout logs today's date with the swapped template and updates that template's weights.
- Past, logged, rest and other-week days cannot be swapped; today cannot be swapped during an active session.
- Delete account and reset data leave no overrides behind.

## Checks
`npm run typecheck`, `npm run lint`, `npm test`; browser check at phone width.

## Log
- 2026-11-17: plan approved. Branch created from main f315505.
- 2026-11-17: T1 RED: `npx jest src/core/schedule` failed with "Cannot find module '../week-swap'" (1 suite failed, 3 passed tests). GREEN after implementation: 22 tests passed. Commit 32caaaf `feat(schedule): add week day swap rules`.
- 2026-11-17: T2 added pure `resetBlock` to core (RED: 5 tests failed with "resetBlock is not defined", then GREEN 27/27). Reset of the week is blocked when a swapped day is past, logged, or today with an active session, because undoing only part of a swap would show one routine twice. Dexie v3 `dayOverrides`, repo `listForRange`/`replaceWeek`/`clearUser`, `loadDayData` honors overrides with `swapped`, `loadWeekPlan`, `swapDays`, `resetWeek`; `resetUserData` and `sync.clearAll` clear overrides. Commit 7411f47 `feat(local): store and apply week day overrides`.
- 2026-11-17: T3 `WeekSwapPanel`, `useWeekSwap`, `SwapDaySheet` (all under 130 lines), mounted below the editor in `/routine`; "Intercambiado" tag on the dashboard heading. Commit 2b7440d `feat(routine): add week day swap panel`.
- 2026-11-17: T4 README feature line and this log.
- Checks: `npm run typecheck` clean, `npm run lint` clean, `npm test` 61 suites / 748 tests passed. Browser check at phone width pending (parent).
