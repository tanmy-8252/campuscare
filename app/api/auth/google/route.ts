import { cookies } from "next/headers";
import { json, sameOrigin } from "@/lib/account";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import { GOOGLE_CALLBACK_PATH, GOOGLE_INTENT_COOKIE, GOOGLE_INTENT_SECONDS, googleStartSchema } from "@/lib/google-intent";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: "Request origin rejected." }, 403);
  if (!supabaseConfigured()) return json({ error: "Account access is not available yet." }, 503);
  if (Number(request.headers.get("content-length")) > 4000) return json({ error: "Request is too large." }, 413);
  try {
    const parsed = googleStartSchema.safeParse(await request.json());
    if (!parsed.success) return json({ error: "Choose a valid role and organisation." }, 400);
    const project = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!);
    const settings = await fetch(new URL("/auth/v1/settings", project), {
      headers: { apikey: (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)! },
      cache: "no-store", signal: AbortSignal.timeout(10000),
    });
    const configuration = settings.ok ? await settings.json() as { external?: { google?: boolean } } : null;
    const enabled = configuration?.external?.google === true;
    if (!enabled) return json({ error: "Google sign-in is not available yet. Please use email for now." }, 503);
    const client = await createClient();
    const { data, error } = await client.auth.signInWithOAuth({ provider: "google", options: {
      redirectTo: new URL(GOOGLE_CALLBACK_PATH, request.headers.get("origin")!).href,
      scopes: "openid email profile", queryParams: { prompt: "select_account", access_type: "online" },
      skipBrowserRedirect: true,
    } });
    if (error || !data.url) return json({ error: "Google sign-in could not be started. Please retry." }, 503);
    const destination = new URL(data.url);
    if (destination.origin !== project.origin || destination.pathname !== "/auth/v1/authorize")
      return json({ error: "Google sign-in could not be started." }, 503);
    const jar = await cookies();
    jar.set(GOOGLE_INTENT_COOKIE, JSON.stringify({ ...parsed.data, createdAt: Date.now() }), {
      httpOnly: true, secure: process.env.VERCEL === "1", sameSite: "lax", path: GOOGLE_CALLBACK_PATH, maxAge: GOOGLE_INTENT_SECONDS,
    });
    return json({ url: destination.href });
  } catch { return json({ error: "Google sign-in could not be started. Please retry." }, 503); }
}
