# Deferred account authentication

The Vercel deployment continues to use browser demo sessions, as requested on 23 October 2026. Student, worker, and administrator choices are role previews. Each browser has its own workspace stored in the existing private Vercel Blob store, and Cloudinary handles photos.

The account implementation from commit `9e02e6e7eb6ecc2381a4935e7ae568d7ff41ea85` is preserved here as `.txt` source drafts so it is not compiled or executed. The complete original changes also remain in Git history. Its schema and migrations remain in `db/` and `drizzle/` as unapplied drafts; the Vercel runtime does not use D1.

The live `/login`, `/register`, `/forgot-password`, and `/reset-password` pages redirect to the demo. Account API endpoints return `503` with `code: DEMO_MODE` and do not collect credentials or initialize an account database. Account packages are removed from the active dependency manifest until this feature is ready.

Before enabling accounts, choose and configure a Vercel-compatible database and email provider, repair the adapter schema and email callbacks, implement server-enforced campus membership and worker/admin permissions, and test account and repair workflows together. Do not enable the draft merely by copying it into the app or setting an environment variable.
