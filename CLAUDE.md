# J-GYM

Mobile-first PWA workout tracker driven by progressive overload.
UI copy is Spanish (voseo); code, comments and commits are English.

## Commands
- `npm run dev` — dev server. Service worker is disabled in dev: test PWA/offline with `npm run build && npm start`.
- `npm run build` — keep `--webpack`, Serwist requires it.
- `npm run lint` · `npm run typecheck` · `npm test` (single file: `npx jest <path>`)
- CI runs lint → typecheck → test → build. Run all four before opening a PR.

## Architecture
Clean Architecture, dependencies point inward:
`src/core` (pure TS, no React/browser/Supabase) ← `src/infrastructure` (Supabase, Dexie, sync engine, auth) ← `src/presentation` (components, Zustand stores) ← `src/app` (routes).
Offline-first: writes go to Dexie + an outbox, then sync to Supabase.
Specs: `docs/specs/overload-rules.md`, `docs/specs/data-model.md`.

## Rules
- NEVER compute or suggest weight. The app progresses sets/reps only; weight increases are always entered by the user.
- UI never touches Supabase directly; go through `src/infrastructure`.
- New overload algorithms implement `src/core/strategies/overload-strategy.interface.ts`.
- No `any`. Components over ~200 lines get split.
- Strict TDD for `src/core`; tests live in `__tests__/` next to the code.

## Gotchas
- `jest.config.ts` lists `roots` explicitly: tests in a new `src/infrastructure/*` folder do not run until you add it there. Presentation has no tests.
- Route protection is `src/proxy.ts` (Next 16 renamed middleware to proxy). There is no `middleware.ts`.
- Migrations in `supabase/migrations/000N_name.sql` are applied by hand in the Supabase SQL editor and must be idempotent. A new synced table needs: migration with RLS, mapper in `src/core/mappers`, and a row in the README migrations table. Code deployed before its migration leaves writes retrying in the outbox.
- RLS: every table is `auth.uid() = user_id`, except `profiles` and `public_stats` (readable by all registered users).
- An intermittent Jest failure was seen right after lint+typecheck in the same command; unresolved (see `odd/NEXT.md`).

## Workflow
- Feature branch + PR to `main`. Supabase dashboard changes are the owner's call.
- Feature docs live in `odd/tasks/`; the cross-session handoff is `odd/NEXT.md`.
