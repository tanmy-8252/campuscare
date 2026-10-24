import { z } from "zod";
import type { Account } from "@/app/account-types";

export const GOOGLE_CALLBACK_PATH = "/auth/google/callback";
export const GOOGLE_INTENT_COOKIE = "cc_google_intent";
export const GOOGLE_INTENT_SECONDS = 15 * 60;
export const googleStartSchema = z.object({
  role: z.enum(["admin", "resident", "worker"]),
  organisationId: z.string().uuid().optional(),
}).strict();
const intentSchema = googleStartSchema.extend({ createdAt: z.number().int() });
export type GoogleIntent = z.infer<typeof intentSchema>;

export function parseGoogleIntent(value: string | undefined, now = Date.now()): GoogleIntent | null {
  if (!value || value.length > 512) return null;
  try {
    const parsed = intentSchema.safeParse(JSON.parse(value));
    if (!parsed.success || parsed.data.createdAt > now + 5000 || now - parsed.data.createdAt > GOOGLE_INTENT_SECONDS * 1000) return null;
    return parsed.data;
  } catch { return null; }
}

// The choice is onboarding intent only. Existing access always comes from the database.
export function googleAccountDestination(intent: GoogleIntent, account: Account | null): string | null {
  if (!account) return "/onboarding?role=" + intent.role;
  if (account.role !== intent.role || account.organisation.id !== intent.organisationId) return null;
  return account.status === "active" ? "/" : "/pending";
}

export const signInNotices: Record<string, string> = {
  "verification-failed": "That email link has expired or was already used. Try signing in, or request a new link.",
  "google-cancelled": "Google sign-in was cancelled. You can try again or use email.",
  "google-expired": "Your Google sign-in attempt expired. Please try again.",
  "google-failed": "Google sign-in could not be completed. Please try again or use email.",
  "google-account-mismatch": "This account does not have the selected role in that organisation. Choose the matching role and organisation, then sign in again.",
};

export function signInNotice(message: string | undefined): string {
  return message && Object.hasOwn(signInNotices, message) ? signInNotices[message] : "";
}
