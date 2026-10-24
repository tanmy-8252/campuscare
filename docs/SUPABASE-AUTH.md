# CampusCare accounts and organisations

The Supabase version replaces browser demo sessions with verified accounts and one organisation membership per account. Public project configuration uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Never put a Supabase secret or service-role key in these variables.

## Account flow

The login page offers Admin, Student / Staff, and Worker. Signing in checks the chosen role and organisation against database membership; choosing a different role cannot grant access. Admin signup creates a new organisation. An existing organisation's admin cannot be selected through public signup.

Students and staff join an existing organisation with its join code and receive access immediately. Workers use the code, choose a specialty, and wait for that organisation's admin to approve or reject their request. Admins find the join code and pending worker requests under Maintenance team. Only approved worker accounts enter the assignment roster.

Organisations start with an empty issue list and no sample workers. Earlier browser demo records stay in the original private Blob store; they are not silently imported into a real organisation.

## Access enforcement

Server pages validate Supabase users and load current membership from the database. Private API routes require active membership. SQL functions independently derive the caller from `auth.uid()` and enforce organisation boundaries and action permissions, including when called directly through Supabase's Data API.

The three `cc_` tables have Row Level Security enabled and no direct grants to `anon` or `authenticated`. Their lack of RLS policies intentionally denies direct table access. Narrow `SECURITY DEFINER` functions use an empty search path and explicit identity and role checks. Supabase's advisor flags these functions for review; this design is intentional. The public directory returns only organisation ID, name, type, and location. Join codes are returned only to the organisation's admin.

Admins assign specialists from their own approved worker roster. Workers read and update their own assignments. Only the original reporter can confirm or reopen a report. All writes lock the organisation's workspace row, avoiding lost updates. Photos are uploaded into an organisation/user folder and checked again when saved. App APIs reject mutations from other origins.

## Setup

Apply `supabase/migrations/202610230001_campuscare_organisations.sql` to the intended project. Configure the public URL and publishable key locally and in Vercel. The app uses cookie sessions through `@supabase/ssr`; the server verifies users, and `proxy.ts` refreshes sessions. Account cookies are HttpOnly because authentication is handled through server routes.

Keep email confirmation enabled. Configure a real SMTP sender before opening registration. For the chosen Gmail sender, use `smtp.gmail.com`, port `587`, sender name `CampusCare`, and the same Gmail address as Sender email and Username. The owner must generate a Google App Password and paste it directly into Supabase. Do not use or store the main Gmail password. Google sending limits and Supabase's authentication email rate limits both apply; Supabase also warns that a personal mail provider can affect transactional email delivery.

Set the Supabase Site URL to the deployed app. Allow only the exact verification and recovery callback URLs needed for production and local development. The callback handler accepts only fixed internal destinations. Preview deployments need separate deliberate configuration; they do not receive production configuration automatically.

## Google sign-in

Email/password access and Google sign-in use the same Supabase account and organisation rules. Choose a role and organisation before signing in. New Google users finish organisation setup; creating a Google session alone grants no organisation access. Existing members must select their actual role and organisation. Pending or rejected workers return to the approval screen. Initial role choices and profile metadata never determine database permissions.

In Google Auth Platform, create an External app and a Web application client. Request only `openid`, `https://www.googleapis.com/auth/userinfo.email`, and `https://www.googleapis.com/auth/userinfo.profile`. Add the deployed app origin as an authorised JavaScript origin. The Google authorised redirect URI is the Supabase project URL followed by `/auth/v1/callback`, not the app callback. Save the client ID and secret directly in Supabase's Google provider and enable it. Keep nonce checking enabled and email-less sign-in disabled. No Google client secret belongs in Vercel's public variables or source control.

Supabase's redirect allowlist must also include the app's exact `/auth/google/callback` address for each intended environment. For this project these are `https://campuscare-phi.vercel.app/auth/google/callback` and `http://127.0.0.1:3011/auth/google/callback`. Keep the existing email verification/recovery addresses. [Google exempts basic name/email/profile sign-in from Testing's test-user list and seven-day authorisation expiry](https://support.google.com/cloud/answer/15549945?hl=en); requesting additional scopes changes those requirements. Branding verification and the move to Production audience status remain separate setup steps. Until branding is verified, the consent screen can identify the Supabase project domain instead of displaying CampusCare's branding.

The app starts OAuth through a same-origin server POST and Supabase PKCE. A short-lived, HttpOnly intent cookie records the selected role/organisation, is scoped to the Google callback, and is cleared on return. The callback exchanges the code, verifies the Supabase user, and checks current database membership. All return paths are fixed internal destinations. Cancellation, expired attempts, and account mismatches show a safe retry message. The app does not request offline Google access or Gmail/Drive permissions.

## Verification

`npm run test:access` runs the real PostgreSQL permission functions in an isolated PGlite database. It checks organisation separation, role escalation, direct table access, pending/rejected workers, assignment ownership, reporter ownership, and repair transitions. This does not replace a real Supabase signup, email confirmation, login, and multi-user browser check.

Run `npm run typecheck` and `npm run build`. Before release, verify email delivery, signup and organisation creation, resident join without approval, pending worker restrictions, approval by the correct admin, each login role, Cloudinary photos, password reset, and logout. Do not mark the account rollout complete until the real email and account flow has passed.
