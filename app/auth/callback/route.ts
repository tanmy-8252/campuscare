import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const host = request.headers.get("host");
  if (host) url.host = host;
  if (process.env.VERCEL === "1") url.protocol = "https:";
  const code = url.searchParams.get("code");
  const hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const client = await createClient();
  const result = code ? await client.auth.exchangeCodeForSession(code)
    : hash && (type === "email" || type === "recovery") ? await client.auth.verifyOtp({ token_hash: hash, type }) : null;
  if (result && !result.error) {
    const next = url.searchParams.get("next") === "/reset-password" || type === "recovery" ? "/reset-password" : "/onboarding";
    return NextResponse.redirect(new URL(next, url.origin));
  }
  return NextResponse.redirect(new URL("/login?message=verification-failed", url.origin));
}
