# CampusCare

A private hackathon prototype for campus maintenance reporting. Built for Hacktober HackDays 2026.

## What is working

- Responsive administrator, student/employee, and worker workspaces.
- Create reports with category, campus zone, exact location, description, and priority.
- Suggest related open reports and add support to an existing report.
- Assign a worker with the right specialty; track work through Reported → Assigned → In progress → Resolved → Confirmed.
- Completion notes, optional photo evidence, and reporter confirmation/reopening.
- Daily counts, month selection, category breakdowns, zone map, and monthly CSV export.
- Persistent Cloudflare D1 workspace per signed-in account, with conflict protection.
- Installable web-app manifest, home-screen icons, and an honest offline fallback.
- Cloudinary signed upload endpoint and optimized image delivery. Real uploads require runtime configuration.

## Scope of this version

The site is owner-private. The role selector previews the three roles inside a single signed-in account. It is not a production authorization system or a shared campus tenant. All workers, locations, and initial reports are sample content. A separate account gets a separate demonstration workspace.

Real campus membership, worker invitations, server-enforced role permissions, a common campus database, push notifications, real campus coordinates, and standalone Android/iOS packages are next-stage work. There is no automatic Notion synchronization.

## Stack

React 19, TypeScript, Vinext/Vite, Cloudflare Workers, D1 SQLite, Drizzle, and Cloudinary. The UI uses Lucide icons. Sites provides private deployment and sign-in.

## Run locally

Node 22.13 or newer is required.

1. Run `npm run install:ci`.
2. Run `npm run build` to generate the local Worker configuration.
3. Apply the migration:
   `node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_tiny_wendigo.sql`
4. Run `npm run dev` and visit the printed loopback address.
5. Local development simulates sign-in; follow the sign-in redirect to open the workspace.

Production database migrations are applied through Sites publication. Keep the existing project ID in `.openai/hosting.json` when updating this private site.

## Cloudinary setup

Configure `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` as hosted runtime secrets, then redeploy. For local development, put the same names in an ignored `.dev.vars` file if supported by the preview runtime. Never commit real values.

The browser requests a short-lived server-generated signature, uploads the image directly to Cloudinary, and saves the resulting secure delivery URL with the issue. Signatures constrain the destination folder and accepted formats. The browser validates image MIME type and a 10 MB limit; configure account-level restrictions and abuse controls before campus deployment. The API secret never enters the browser.

Photo upload buttons explicitly show setup pending until configuration exists. Real Cloudinary upload/delivery could not be tested without an account. Reports can be submitted without photos.

## Verification

- TypeScript check and production build.
- Local API lifecycle: create, assign, start, resolve, confirm, reopen.
- Wrong-specialty worker, wrong-worker transition, invalid state transitions, duplicate support, malformed fields, missing report, cross-origin request, and unauthenticated API checks.
- Browser exercise of reporting, assignment, worker progress, and completion.
- Responsive phone preview at 390 px.

The development API checks are under ignored `work/` and use only the isolated local demonstration account. Hosted and local databases are separate.

## Data model

For the prototype, one workspace row stores a JSON report collection and worker collection under the authenticated account ID. A version check prevents concurrent writes from silently overwriting one another. Before scaling to a campus tenant, normalize issues, events, assignments, members, workers, and support records into separate indexed tables.

## Documentation

Import `NOTION-JOURNAL.md` into your team's Notion workspace and add your daily evidence and decisions. The journal is a draft handoff, not proof that Notion has been updated.
