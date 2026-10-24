import { accountContext, json, sameOrigin } from "@/lib/account";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import { logout } from "@/lib/auth-endpoints";
import { z } from "zod";

export const dynamic = "force-dynamic";
const credentials = z.object({ email: z.string().trim().toLowerCase().email().max(254), password: z.string().min(10).max(128) });
const loginSchema = credentials.extend({ role: z.enum(["admin", "resident", "worker"]), organisationId: z.string().uuid().optional() });
const registerSchema = credentials.extend({ name: z.string().trim().min(2).max(80), role: z.enum(["admin", "resident", "worker"]) });

export async function GET() {
  try {
    const { user, account } = await accountContext();
    return json({ signedIn: !!user, account });
  } catch { return json({ error: "Account could not be loaded." }, 503); }
}

export async function POST(req: Request, context: { params: Promise<{ all: string[] }> }) {
  if (!sameOrigin(req)) return json({ error: "Request origin rejected." }, 403);
  if (!supabaseConfigured()) return json({ error: "Account setup is still being connected. Please try again later." }, 503);
  const action = (await context.params).all.join("/");
  try {
    if (action === "logout") return logout(req);
    if (Number(req.headers.get("content-length")) > 16000) return json({ error: "Request is too large." }, 413);
    const body = await req.json();
    const client = await createClient();
    if (action === "login") {
      const parsed = loginSchema.safeParse(body);
      if (!parsed.success) return json({ error: "Check your email, password, and selected role." }, 400);
      const { email, password, role, organisationId } = parsed.data;
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) return json({ error: "Sign in failed. Check your email and password, and verify your email if needed." }, 401);
      const { data: account, error: contextError } = await client.rpc("cc_context");
      if (contextError) { await client.auth.signOut(); return json({ error: "Organisation membership could not be checked." }, 503); }
      if (account && (account.role !== role || account.organisation.id !== organisationId)) {
        await client.auth.signOut();
        return json({ error: "This account does not have the selected role in that organisation." }, 403);
      }
      return json({ next: !account ? "/onboarding" : account.status === "active" ? "/" : "/pending" });
    }
    if (action === "register") {
      const parsed = registerSchema.safeParse(body);
      if (!parsed.success) return json({ error: "Enter your name, a valid email, and a password of 10–128 characters." }, 400);
      const { email, password, name, role } = parsed.data;
      const { data, error } = await client.auth.signUp({ email, password, options: {
        data: { name, onboardingRole: role },
        emailRedirectTo: new URL("/auth/callback", req.headers.get("origin")!).href,
      } });
      if (error) return json({ error: "Your account could not be created. Check the details or try signing in." }, 400);
      return json({ verifyEmail: !data.session, next: data.session ? "/onboarding" : "/login" });
    }
    if (action === "forgot") {
      const parsed = z.object({ email: z.string().trim().email().max(254) }).safeParse(body);
      if (!parsed.success) return json({ error: "Enter a valid email." }, 400);
      const { error } = await client.auth.resetPasswordForEmail(parsed.data.email, { redirectTo: new URL("/auth/callback?next=/reset-password", req.headers.get("origin")!).href });
      if (error) return json({ error: "The reset email could not be sent. Please retry later." }, 503);
      return json({ message: "If an account exists for that email, a password reset link will be sent." });
    }
    if (action === "reset") {
      const parsed = z.object({ password: z.string().min(10).max(128) }).safeParse(body);
      if (!parsed.success) return json({ error: "Use a password of 10–128 characters." }, 400);
      const { data: { user } } = await client.auth.getUser();
      if (!user) return json({ error: "Open a valid password reset link first." }, 401);
      const { error } = await client.auth.updateUser({ password: parsed.data.password });
      if (error) return json({ error: "The password could not be changed." }, 400);
      await client.auth.signOut();
      return json({ next: "/login" });
    }
    return json({ error: "Account endpoint not found." }, 404);
  } catch { return json({ error: "The request could not be completed. Please retry." }, 503); }
}
