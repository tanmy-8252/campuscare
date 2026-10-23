> **Status — 23 October 2026:** Account authentication is deferred. The live Vercel app uses demo sessions and private Blob storage. This is an unverified historical draft describing an earlier Cloudflare architecture. See `docs/deferred-auth/README.md` before implementing it.

# CampusCare Individual Authentication Implementation Plan

## Current Architecture Analysis

### Authentication Flow (Current)
- Uses ChatGPT OAuth via headers: `oai-authenticated-user-id`, `oai-authenticated-user-email`, `oai-authenticated-user-full-name`
- `app/chatgpt-auth.ts` extracts these headers and redirects to `/signin-with-chatgpt` if missing
- Workspace ownership keyed by ChatGPT user ID (`ownerId` in `workspaces` table)

### Database (Current)
- Single `workspaces` table: `ownerId` (PK), `data` (JSON), `version` (optimistic locking)
- No user table, no session table, no roles table
- Workspace seeded with sample data on first access

### API Routes
- `/api/workspace` - GET/POST for workspace data (issues, workers)
- `/api/upload` - POST for Cloudinary signed upload URLs
- Both protected by ChatGPT auth headers

### Constraints
- Cloudflare Workers runtime (no Node.js crypto, no fs)
- D1 SQLite database
- Vinext/Vite for development
- Sites platform provides hosting and ChatGPT auth

---

## Implementation Plan

### 1. Authentication Solution: Better Auth (Cloudflare Workers Compatible)

**Choice:** Better Auth with Drizzle adapter for D1
**Why:**
- Native Cloudflare Workers support
- Built-in email/password, session management, email verification
- Secure password hashing (Argon2 via `@node-rs/argon2` which works in Workers)
- Type-safe with Drizzle
- Supports custom user fields (role)
- Session cookies with proper security flags

**Packages to add:**
- `better-auth` - core auth library
- `@better-auth/drizzle` - Drizzle adapter
- `@node-rs/argon2` - password hashing (WebAssembly, Workers compatible)
- `zod` - already installed, for validation

### 2. Database Schema Extensions

**New Tables:**
```sql
-- Users table (extends workspace ownership)
users:
  - id (PK, text) - internal user ID
  - email (unique, text)
  - emailVerified (boolean)
  - name (text)
  - passwordHash (text)
  - role (text, enum: 'resident' | 'worker' | 'admin') - default 'resident'
  - createdAt (integer, timestamp)
  - updatedAt (integer, timestamp)

-- Sessions table (Better Auth managed)
sessions:
  - id (PK, text)
  - userId (FK, text)
  - expiresAt (integer, timestamp)
  - token (unique, text)
  - ipAddress (text, nullable)
  - userAgent (text, nullable)

-- Accounts table (Better Auth for OAuth linking if needed)
accounts:
  - id (PK, text)
  - userId (FK, text)
  - providerId (text)
  - accountId (text)
  - passwordHash (text, nullable) - for email/password
  - accessToken (text, nullable)
  - refreshToken (text, nullable)
  - expiresAt (integer, nullable)

-- Verification tokens (email verification, password reset)
verificationTokens:
  - id (PK, text)
  - identifier (text) - email
  - token (unique, text)
  - expiresAt (integer, timestamp)
  - type (text) - 'email_verification' | 'password_reset'
```

**Migration Strategy:**
- Keep existing `workspaces` table with `ownerId` as ChatGPT user ID
- Add `userId` column to `workspaces` table (FK to users)
- On first login with individual auth, create user record and link workspace
- For existing ChatGPT users: map their ChatGPT user ID to new internal user ID
- Use a `chatGptUserId` column on `users` table for backward compatibility

### 3. Authentication Routes

**New Route Files (Next.js App Router):**
- `app/login/page.tsx` - Login page
- `app/register/page.tsx` - Registration page
- `app/forgot-password/page.tsx` - Forgot password page
- `app/reset-password/page.tsx` - Reset password page (token from email)
- `app/api/auth/[...better-auth]/route.ts` - Better Auth handler
- `app/api/auth/session/route.ts` - Session check endpoint
- `app/api/auth/logout/route.ts` - Logout endpoint

### 4. Authentication Helpers

**New File: `app/auth.ts`**
- `getUser()` - Get current authenticated user from session cookie
- `requireAuth()` - Redirect to login if not authenticated
- `requireRole(roles)` - Check authorization for specific roles
- Session cookie management (HttpOnly, Secure, SameSite=Lax)

### 5. API Route Protection

**Modify:**
- `app/api/workspace/route.ts` - Use `getUser()` instead of ChatGPT headers
- `app/api/upload/route.ts` - Use `getUser()` instead of ChatGPT headers

**Preserve ChatGPT Auth:**
- Keep `chatgpt-auth.ts` for backward compatibility
- Add dual-auth support: try session cookie first, fall back to ChatGPT headers
- This ensures existing ChatGPT-authenticated sessions continue working

### 6. UI Components

**Leverage Existing:**
- `components/ui/button.tsx`, `components/ui/input.tsx`, `components/ui/label.tsx`
- `components/ui/card.tsx`, `components/ui/alert.tsx`
- `components/ui/form.tsx` with Zod validation
- Lucide icons for branding
- Existing CSS design system (globals.css)

**New Components:**
- `components/auth/AuthLayout.tsx` - Two-column layout (branding + form)
- `components/auth/LoginForm.tsx`
- `components/auth/RegisterForm.tsx`
- `components/auth/ForgotPasswordForm.tsx`
- `components/auth/ResetPasswordForm.tsx`

### 7. Role-Based Access Control

**Roles:**
- `resident` - Default for public registration (students/staff)
- `worker` - Created via admin invitation only
- `admin` - Provisioned via secure process (CLI or existing admin)

**Implementation:**
- Store role in user record and session
- Server-side checks in API routes
- Frontend role-based UI rendering (existing role preview remains for demo)

### 8. Environment Variables

**New Required:**
```
BETTER_AUTH_SECRET= # 32+ char random string
BETTER_AUTH_URL=http://localhost:5173 (or production URL)
EMAIL_SERVER_HOST= # SMTP host for verification emails
EMAIL_SERVER_PORT= # SMTP port
EMAIL_SERVER_USER= # SMTP username
EMAIL_SERVER_PASSWORD= # SMTP password
EMAIL_FROM=noreply@campuscare.app
```

**Optional (for production):**
```
RESEND_API_KEY= # If using Resend for emails
```

### 9. Development Setup

**Local Development:**
- Create `.dev.vars` with required env vars
- Run D1 migrations: `npm run db:generate` then apply via wrangler
- Start dev server: `npm run dev`

**Migration Commands:**
```bash
# Generate migration
npm run db:generate

# Apply locally
wrangler d1 execute DB --local --file drizzle/0001_add_auth_tables.sql

# Apply to production (via Sites publication)
```

---

## File Changes Summary

### New Files:
1. `db/schema.ts` - Extended with auth tables
2. `app/auth.ts` - Auth helpers
3. `app/api/auth/[...better-auth]/route.ts` - Better Auth handler
4. `app/login/page.tsx` - Login page
5. `app/register/page.tsx` - Registration page
4. `app/forgot-password/page.tsx` - Forgot password
5. `app/reset-password/page.tsx` - Reset password
6. `components/auth/AuthLayout.tsx` - Auth page layout
7. `components/auth/LoginForm.tsx`
8. `components/auth/RegisterForm.tsx`
9. `components/auth/ForgotPasswordForm.tsx`
10. `components/auth/ResetPasswordForm.tsx`
11. `drizzle/0001_add_auth_tables.sql` - Migration

### Modified Files:
1. `app/api/workspace/route.ts` - Use new auth
2. `app/api/upload/route.ts` - Use new auth
3. `app/page.tsx` - Use new auth helper
4. `package.json` - Add dependencies

---

## Testing Checklist

- [ ] TypeScript compiles without errors
- [ ] Lint passes
- [ ] Production build succeeds
- [ ] User can register with valid data
- [ ] Duplicate email rejected
- [ ] Invalid password rejected
- [ ] Email verification works
- [ ] User can login with correct credentials
- [ ] Wrong password rejected
- [ ] Session persists across page reloads
- [ ] Logout invalidates session
- [ ] Unauthenticated API requests return 401
- [ ] User A cannot access User B's workspace
- [ ] Resident cannot call admin/worker APIs
- [ ] Public registration creates resident role only
- [ ] ChatGPT auth still works (backward compatibility)
- [ ] Existing issue workflows work
- [ ] Cloudinary uploads work
- [ ] Pages render correctly on desktop and mobile