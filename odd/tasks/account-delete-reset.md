# Account: delete account and reset data

Branch `feat/account-delete-reset`. Strict TDD on pure core logic (runner `npm test`).

## Objective
Two profile menu actions: delete the whole account, and reset the data while keeping the account.

## Tasks
- [x] T1 Migration 0006 `delete_own_account()` (SECURITY DEFINER, cascade verified in 0001/0002/0004/0005).
- [x] T2 Core rules in `src/core/account` (confirmation phrase, online guard, workout-in-progress guard), RED then GREEN.
- [x] T3 Infrastructure: `deleteOwnAccount` (RPC, wipe, local sign-out) and `resetOwnData` (outbox deletes, empty stats snapshot).
- [x] T4 UI: `useDeleteAccount` / `useResetData` hooks, two sheets, menu items, login notice, UserProfile split.
- [x] T5 Docs: README migrations list and Account section.

## Acceptance
- Delete is blocked offline and until `ELIMINAR` is typed; on failure nothing local is deleted; on success the device is wiped and the user lands on `/login?deleted=1`.
- Reset is blocked during a workout, works offline through the outbox, keeps account and profile, and queues zeroed stats.

## Notes
- Delete ops for routines, logs and custom exercises already existed in the outbox; RLS DELETE policies exist in 0001 and 0002. No policy changes needed.
