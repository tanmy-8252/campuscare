# CampusCare — Hacktober HackDays building journal

**Event:** Hacktober HackDays, SheBuilds Delhi Chapter  
**Finale:** 31 October 2026, PWIOI, Noida  
**Team:** Add your 2–4 team members  
**Journal started:** 23 October 2026  
**Status:** Initial private prototype built; Cloudinary account setup and real campus identity pending

> Import this document into the team's Notion workspace. This local draft does not satisfy the requirement to maintain the journey on Notion until imported and updated there.

## Problem

In a college or workplace spread over 400–500 acres, small electrical, sanitation, plumbing, and infrastructure problems are difficult to discover, locate, assign, and follow through. Reports are fragmented, workers lack an organized queue, and reporters cannot easily see whether a problem was fixed.

## Users

- Students and employees: report precise locations and follow repairs on phones.
- Maintenance workers: receive assignments, update progress, and share completion evidence on phones.
- Administrators: triage reports, assign specialists, and view daily/monthly trends on desktop and phone.

## Proposed solution

An installable web app with three role-based experiences and a visible reporting-to-resolution timeline.

## MVP journey

1. A campus member submits a category, description, zone, exact location, and optional photo.
2. Related open reports are suggested to reduce duplicates.
3. An administrator assigns a specialist and priority.
4. The worker starts the job, records the repair, and optionally uploads completion evidence.
5. The reporter confirms the repair or reopens the issue.

## Technology decision

Start with a responsive PWA using React and TypeScript. The first prototype used Cloudflare Workers and D1; the Vercel deployment uses standard Next.js and private Vercel Blob workspace records. Use Cloudinary for signed image upload and optimized delivery. The same API design can support dedicated native mobile apps later.

The current role switcher is a demo tool. Production role permissions and common campus membership are not implemented yet.

## Cloudinary integration

Implemented: server signature endpoint, direct browser upload flow, category report and completion-photo fields, and optimized image URLs.

Pending: add the team's Cloudinary cloud name, API key, and API secret to hosted runtime secrets; redeploy and capture successful upload evidence. Never paste the API secret into Notion.

## Research to complete

- Interview a student, a maintenance worker, and a campus administrator.
- Record how issues are reported today, who dispatches work, and what slows a repair.
- Validate the most useful location fields.
- Agree on priority definitions and escalation ownership.
- Get a real campus layout and a representative worker roster.

## Task board

| Task                                               | Status | Owner     |
| -------------------------------------------------- | ------ | --------- |
| Define maintenance problem and users               | Done   | Team      |
| Build responsive role previews                     | Done   | Add owner |
| Build report and repair lifecycle                  | Done   | Add owner |
| Add persistent online demo data                    | Done   | Add owner |
| Add daily/monthly reports                          | Done   | Add owner |
| Prepare Cloudinary upload integration              | Done   | Add owner |
| Configure and test real Cloudinary uploads         | To do  | Add owner |
| Import and maintain this journal on Notion         | To do  | Team      |
| Add campus membership and protected staff roles    | To do  | Add owner |
| Replace sample campus layout and reports           | To do  | Add owner |
| Test installation on actual Android/iPhone devices | To do  | Add owner |
| Prepare pitch and demo recording                   | To do  | Team      |

## 23 October 2026 — First build

**Built:** Three responsive workspaces, report creation, related report suggestions, worker assignment, progress updates, completion notes, confirmation/reopening, zone view, daily chart, monthly CSV export, install manifest, and private online persistence.

**Validated:** Production build, TypeScript, API lifecycle and rejection paths. Browser checks cover the report/assignment/repair journey.

**Limitations:** Photo integration needs a real Cloudinary account. The app uses a single-account demo workspace and role previews. Actual phone installation, production campus permissions, notifications, and a real map remain to be validated/built.

**Add evidence:** Hosted preview link, screenshots, team contributions, actual device test results, and a successful Cloudinary upload screenshot after setup.

## Daily update template

### Date — What we built

- Goal for the day:
- Changes:
- Why we made these decisions:
- Who contributed:
- What we tested:
- Screenshot / demo link:
- Blockers:
- Next step:

## Suggested demo script

1. Introduce the 400–500 acre campus maintenance problem.
2. Open the student view on a phone and report a broken light.
3. Show the administrator's new-report count and assign an electrician.
4. Switch to the worker and start/complete the repair.
5. Return to the reporter and confirm the fix.
6. Show the audit timeline and monthly dashboard.
7. Once configured, show a real issue photo and repair photo in Cloudinary.
8. Open this Notion journal and explain the team's building journey.

## Sources

- PWA installation: https://web.dev/learn/pwa/installation
- PWA manifest: https://web.dev/learn/pwa/web-app-manifest
- Cloudinary signed browser uploads: https://cloudinary.com/documentation/client_side_uploading
- Cloudinary Upload API: https://cloudinary.com/documentation/image_upload_api_reference

## 23 October 2026 — Vercel migration

**Requested:** Deploy the GitHub application to Vercel.

**Changed:** Replaced platform-specific sign-in with a private browser demo session, added private Vercel Blob persistence with ETag conflict checks, and moved the default build to Next.js 16.4.2. Cloudflare scaffolding remains for reference. Each browser has its own isolated demonstration workspace; real campus accounts and cross-device membership are still pending.

**Storage:** Private campuscare-reports store in Mumbai (BOM1). Connect it to the CampusCare project and verify the deployed lifecycle.

**Evidence:** Add the verified production URL and live workflow screenshots after deployment.
