# CampusCare

Campus maintenance reporting for Hacktober HackDays 2026. Students and staff report problems, administrators assign approved specialists, and workers record repairs.

## Features

- Phone-friendly student/staff and worker workspaces; an administrator dashboard on desktop and phone.
- Verified email accounts and Google sign-in with Admin, Student / Staff, and Worker login choices. The selected role and organisation must match the account's actual membership.
- Admin organisation registration and private join codes. Students/staff join immediately; workers require approval from their organisation's admin.
- Server and database permission checks for organisation separation, worker assignments, and reporter confirmation.
- Categories, campus zones, exact locations, priorities, related report suggestions, and support for existing reports.
- Reported → Assigned → In progress → Resolved → Confirmed, with completion notes and reopening.
- Daily/monthly charts, category summaries, CSV export, approved worker management, and an illustrative campus map.
- Signed Cloudinary report/completion photo uploads scoped to the organisation and uploading account.
- PWA manifest, home-screen icons, phone navigation, and an offline information screen.

## Accounts and data

The app uses Next.js 16.4.2, React 19, TypeScript, and Supabase Auth/Postgres. Each account belongs to one organisation. New organisations start empty. Worker accounts cannot access jobs until approved, and can then view and update only their own assignments. Only the original reporter can confirm or reopen a repair.

The three CampusCare tables deny direct public/authenticated table access. Narrow database functions derive the caller from `auth.uid()` and enforce membership and permissions independently of the app. Workspace writes lock the organisation's row to avoid lost updates. See [the authentication guide](docs/SUPABASE-AUTH.md) for the schema and security design.

The previous private Vercel Blob demo records remain preserved in their original store. Real accounts use Supabase; browser demo role switching is no longer available. The older Cloudflare/D1 scaffolding and deferred-auth notes remain only as historical reference.

## Run locally

Use Node.js 22.13 or newer.

1. Run `npm ci --no-audit --no-fund`.
2. Apply `supabase/migrations/202610230001_campuscare_organisations.sql` to the intended Supabase project once.
3. Copy `.env.example` to ignored `.env.local` and configure the public Supabase URL and publishable key. Never use a secret or service-role key in a `NEXT_PUBLIC_` variable.
4. Keep email confirmation enabled and configure SMTP. Set the Supabase Site URL and allow the exact verification/recovery callback URLs described in the authentication guide.
5. Run `npm run dev`. Register an admin, verify the email, and finish organisation setup. Share its join code with members; approve workers under Maintenance team.

If using the prepared local callback allowlist, start with `npm run dev -- --hostname 127.0.0.1 --port 3011`. Verification links should be opened in the browser that requested them. Missing Supabase configuration shows a setup message; it does not open a demo session.

Checks:

- `npm run test:access` — real PostgreSQL permission tests in an isolated PGlite database.
- `npm run test:google` — OAuth intent expiry, internal return paths, and membership/worker-approval routing.
- `npm run typecheck`
- `npm run build`
- `npm start`

The isolated permission tests do not replace real email, session, and multi-account checks. Verify signup, recovery, organisation membership, approval, wrong-role rejection, repair ownership, photos, and logout before releasing an account change.

## Deploy to Vercel

1. Import `tanmy-8252/campuscare` as a Next.js project.
2. Configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for the intended environment.
3. Configure Supabase SMTP and the production Site URL and exact callback/recovery URLs. Do not disable email confirmation to work around delivery problems.
4. Configure the three Cloudinary variables below and deploy the production branch. `vercel.json` declares the framework, build command, and Mumbai function region.
5. Verify signed-out access redirects to login and test each role against the deployed application.

Preview deployments need their own deliberate environment and callback configuration. Keep SMTP, Cloudinary, and other secret credentials out of GitHub and browser bundles.

## Cloudinary

Set these Vercel runtime variables and redeploy:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

The secret stays on the server. An active member requests a signature and uploads directly to an organisation/account folder. The secure delivery URL is validated again when saving a report or repair. Reports can be submitted without photos.

## Notion

The building journey is maintained in the team's Notion workspace. `NOTION-JOURNAL.md` is an earlier draft and is not automatic Notion synchronization.

## Further campus rollout work

Add organisation administration/revocation tools, report notifications, real map coordinates, and physical-device installation testing. Workspaces currently store issues and workers as one locked JSON record per organisation; normalize issues, events, and assignments before a larger campus rollout.

## References

- [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs)
- [Supabase server-side authentication](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Cloudinary signed uploads](https://cloudinary.com/documentation/client_side_uploading)
