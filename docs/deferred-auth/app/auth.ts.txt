import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { getDb } from "@/db";
import { users, sessions, accounts, verificationTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

// ============================================
// Better Auth Instance
// ============================================

export const auth = betterAuth({
  database: drizzleAdapter(getDb(), {
    provider: "sqlite",
    schema: {
      users,
      sessions,
      accounts,
      verificationTokens,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },
  cookies: {
    sessionToken: {
      name: "campuscare_session",
      options: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      },
    },
  },
  advanced: {
    crossSubDomainCookies: {
      enabled: false,
    },
    defaultCookieAttributes: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "resident",
        input: false, // Don't allow setting role via API
      },
      chatGptUserId: {
        type: "string",
        required: false,
        unique: true,
        input: false,
      },
    },
  },
  hooks: {
    after: {
      register: async ({ user }) => {
        // Role is already set to 'resident' by default
        // No additional action needed for standard registration
      },
    },
  },
});

// ============================================
// Auth Helpers
// ============================================

export type UserRole = "resident" | "worker" | "admin";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  role: UserRole;
  chatGptUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get the current authenticated user from the session cookie.
 * Returns null if not authenticated.
 */
export async function getUser(): Promise<AuthUser | null> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) return null;

    // Fetch additional user fields (role, chatGptUserId)
    const db = getDb();
    const userRecord = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        emailVerified: users.emailVerified,
        role: users.role,
        chatGptUserId: users.chatGptUserId,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!userRecord[0]) return null;

    return userRecord[0];
  } catch {
    return null;
  }
}

/**
 * Get the current authenticated user, redirecting to login if not authenticated.
 * Use this in page components that require authentication.
 */
export async function requireAuth(returnTo?: string): Promise<AuthUser> {
  const user = await getUser();
  if (!user) {
    const loginUrl = `/login${returnTo ? `?redirect=${encodeURIComponent(returnTo)}` : ""}`;
    redirect(loginUrl);
  }
  return user;
}

/**
 * Get the current authenticated user with role check.
 * Redirects to login if not authenticated or to unauthorized page if role doesn't match.
 */
export async function requireRole(
  allowedRoles: UserRole[],
  returnTo?: string
): Promise<AuthUser> {
  const user = await requireAuth(returnTo);
  if (!allowedRoles.includes(user.role)) {
    redirect("/unauthorized");
  }
  return user;
}

/**
 * Check if the current user has the required role.
 * Does not redirect, just returns boolean.
 */
export async function hasRole(role: UserRole): Promise<boolean> {
  const user = await getUser();
  return user?.role === role;
}

/**
 * Check if the current user is an administrator.
 */
export async function isAdmin(): Promise<boolean> {
  return hasRole("admin");
}

/**
 * Check if the current user is a maintenance worker.
 */
export async function isWorker(): Promise<boolean> {
  return hasRole("worker");
}

/**
 * Check if the current user is a resident (student/staff).
 */
export async function isResident(): Promise<boolean> {
  return hasRole("resident");
}

/**
 * Sign out the current user.
 */
export async function signOut(redirectTo = "/login"): Promise<void> {
  await auth.api.signOut({
    headers: await headers(),
  });
  redirect(redirectTo);
}

/**
 * Get session data without redirecting.
 * Useful for API routes that need to check auth.
 */
export async function getSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}

/**
 * Type-safe session user type for API routes
 */
export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  role: UserRole;
} | null;