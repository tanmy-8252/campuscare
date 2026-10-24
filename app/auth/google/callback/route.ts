import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GOOGLE_CALLBACK_PATH, GOOGLE_INTENT_COOKIE, googleAccountDestination, parseGoogleIntent } from "@/lib/google-intent";
import type { Account } from "@/app/account-types";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const host = request.headers.get("host");
  if (host) url.host = host;
  if (process.env.VERCEL === "1") url.protocol = "https:";
  const fail = (message: string) => NextResponse.redirect(new URL("/login?message=" + message, url.origin));
  const jar = await cookies();
  const intent = parseGoogleIntent(jar.get(GOOGLE_INTENT_COOKIE)?.value);
  jar.set(GOOGLE_INTENT_COOKIE, "", { path: GOOGLE_CALLBACK_PATH, maxAge: 0, httpOnly: true, secure: process.env.VERCEL === "1", sameSite: "lax" });
  if (url.searchParams.has("error")) return fail("google-cancelled");
  if (!intent) return fail("google-expired");
  const code = url.searchParams.get("code");
  if (!code) return fail("google-failed");
  try {
    const client = await createClient();
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (error) return fail("google-failed");
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError || !user) return fail("google-failed");
    const { data, error: membershipError } = await client.rpc("cc_context");
    if (membershipError) { await client.auth.signOut(); return fail("google-failed"); }
    const next = googleAccountDestination(intent, data as Account | null);
    if (!next) { await client.auth.signOut(); return fail("google-account-mismatch"); }
    return NextResponse.redirect(new URL(next, url.origin));
  } catch { return fail("google-failed"); }
}
