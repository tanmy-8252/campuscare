# CampusCare

A campus maintenance reporting prototype built for Hacktober HackDays 2026. Students and employees report problems, administrators assign specialists, and workers record repairs.

## Features

- Phone-friendly student/employee and worker workspaces; an administrator dashboard on desktop and phone.
- Categories, campus zones, exact locations, priorities, related report suggestions, and support for existing reports.
- Reported → Assigned → In progress → Resolved → Confirmed, with completion notes and reopening.
- Daily/monthly charts, category summaries, CSV export, worker management, and an illustrative campus map.
- PWA manifest, home-screen icons, phone navigation, and an offline information screen.
- Signed Cloudinary report/completion photo uploads, once account credentials are configured.

## Stack and deployment

The Vercel version uses Next.js 16.4.2, React 19, TypeScript, and private Vercel Blob storage. Report collections are stored as private JSON objects with conditional ETag writes to protect concurrent updates. Reads bypass the CDN cache.

The original Cloudflare/Vinext scaffolding and D1 migration remain in the repository for history/reference. The default commands now target standard Next.js; the current runtime does not require Cloudflare D1 or ChatGPT sign-in.

## Demo identity and privacy

This is a prototype with a role preview switcher, sample workers, and sample reports. It does not yet implement campus membership or independent staff permissions.

Each browser gets an unguessable, HttpOnly, SameSite demo-session cookie. A derived identifier scopes its private server-side data. Refreshing or changing roles preserves that browser's workspace. A different browser or device has a separate demo workspace. Clearing the cookie loses access to that workspace; there is no account recovery in this prototype. Never use it for sensitive real-world campus records.

## Run locally

Use Node.js 22.13 or newer.

1. Run `npm ci --no-audit --no-fund`.
2. Run `npm run dev`.
3. Open the printed localhost address. A demo session is created automatically.

Without Blob credentials, local development saves records under ignored `.campuscare-data/`. Deployed Vercel functions require private Blob storage and never fall back to ephemeral local files.

Production checks:

- `npm run typecheck`
- `npm run build`
- `npm start`

## Deploy to Vercel

1. Import `tanmy-8252/campuscare` from GitHub as a Next.js project.
2. Connect the private `campuscare-reports` Blob store to the CampusCare project for Production and Preview.
3. Vercel injects the storage connection environment values. The SDK supports a read-write token, or a connected store ID with Vercel's rotating OIDC identity.
4. Deploy the production branch. `vercel.json` declares the framework, build command, and Mumbai function region.
5. Verify creation, assignment, completion, confirmation, and persistence on the deployed URL.

Keep storage credentials out of GitHub and browser bundles. Development and deployed demo records are separate.

## Cloudinary

Configure these as Vercel runtime environment variables and redeploy:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

The API secret stays server-side. The browser requests a signature and uploads directly to Cloudinary, then saves the secure delivery URL. Photo controls show setup pending until all three values exist. Reports can be submitted without photos.

## Notion

Import `NOTION-JOURNAL.md` into the team's Notion workspace and update it daily. This file is a draft journal, not automatic Notion synchronization.

## Before a campus launch

Add actual campus membership, server-enforced roles, a shared campus data model, worker invitations, notifications, real map coordinates, and physical-device installation testing. Normalize issues/events/assignments into a database when moving beyond this small demo workspace.

## References

- [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs)
- [Private Vercel Blob storage](https://vercel.com/docs/vercel-blob/using-blob-sdk)
- [Cloudinary signed uploads](https://cloudinary.com/documentation/client_side_uploading)
