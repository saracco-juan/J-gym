# What comes next

Handoff written 2026-11-17. Start here when resuming on any machine.

## How to resume
1. Open Claude Code with this repo folder (`J-gym`) as the working directory, so `AGENTS.md` loads.
2. Install the design skill used by the UI:
   `npx skills add elayadesign/ai-design-skills --skill landing-page-design -g`
3. Ask: "Read odd/NEXT.md and odd/tasks/stage2-routine-and-leaderboard.md and continue from the next open step."

Workflow conventions: ODD task docs live in `odd/tasks/` (one per feature, checklist plus evidence log). Strict TDD on pure core logic. Conventional Commits without AI attribution. Feature work goes through a branch and a PR, never straight to `main`; push, merge and Supabase dashboard changes are the owner's decisions.

## Where we are
- **Stage 1** (offline-first gym use) is in production. See `odd/tasks/stage1-offline-gym.md`. S8 (code login) was postponed there and is now delivered by Stage 2 T7.
- **Stage 2** (routine control, progress, redesign, leaderboard) is in production: final PR saracco-juan/J-gym#17 merged on 2026-11-17. All tasks T1 to T11 are done. See `odd/tasks/stage2-routine-and-leaderboard.md`.
- Supabase migrations 0001 to 0005 are applied. The daily keep-alive heartbeat runs from `main`.
- Production check after the merge: deploy success, `/login` has no demo button, `/~offline` returns 200, `/leaderboard` redirects to login without a session.

## J-gym: open steps, in order
1. **Email delivery (owner, Supabase dashboard).**
   - Authentication > Emails > SMTP Settings: enable custom SMTP with Gmail (host `smtp.gmail.com`, port 465, the Gmail address as user, a Google app password).
   - Templates **Magic Link** and **Change Email Address** must include `{{ .Token }}`.
2. **Test code login** with a new account (production or a preview): code arrives, sign in, onboarding, profile creation, the account shows on `/leaderboard` after finishing a workout.
3. **Owner links their email on the iPhone.** The owner uses an anonymous (old demo) account that holds real data. In the installed app: dashboard banner "Vinculá tu email", enter the code, then create the profile. Same user id, so all data stays. Check that the banner disappears afterwards.
4. **Only after step 3:** disable "Allow anonymous sign-ins" in Supabase. Doing it earlier locks the owner out of their data.
5. Verify on the iPhone: leaderboard tabs, player card, history chart, routine editor, offline opening of the new screens.

## J-gym: follow-ups
- A fresh device only pulls 120 days of logs, so its first stats snapshot can publish lower XP, achievements and best lifts. Guard it (merge with the published snapshot, or pull all logs before publishing).
- An intermittent jest failure was seen twice, both times right after typecheck and lint in the same command. Never reproduced in later runs. Find it (likely a timeout under load).
- `src/presentation/components/dashboard/UserProfile.tsx` is about 220 lines; split it.
- The stats streak applies the current routine to past dates (documented simplification).

## Portfolio roadmap (outside this repo)
Goal: every portfolio project deployed for free, with a light refactor (dead code removed, env vars instead of secrets, lint, a few tests, a clear README), one branch and one PR per project, host proposed and approved before deploying. One Claude Code session per repo.
1. **J-gym**: done apart from the open steps above.
2. **Buenas Lecturas**: Render (Docker) plus Neon Postgres.
3. **Dolar App**: transfer the repo to `saracco-juan`, host on Vercel.
4. **GLYPHA**: restrict the Firebase API key, publish an APK.
5. **OneUpGym**: ask the owner first whether to fork it or get access. Before publishing anything, it has a committed SQLite database with a third party's personal data that must be removed from the repo and its history.
6. **TD Autos**: excluded.
7. **Finally**: update the live links in `saracco-juan/portfolio` (`src/components/Portfolio/Portfolio.tsx`, array `PROJECTS`) and in the GitHub profile README (`saracco-juan/saracco-juan`).
