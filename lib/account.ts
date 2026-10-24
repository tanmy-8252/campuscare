import "server-only";
import { createClient, supabaseConfigured } from "./supabase/server";
import { redirect } from "next/navigation";
import type { Account } from "@/app/account-types";

export async function accountContext() {
  if (!supabaseConfigured()) return { user: null, account: null, client: null };
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return { user: null, account: null, client };
  const { data, error: membershipError } = await client.rpc("cc_context");
  if (membershipError) throw new Error("Organisation membership could not be loaded.");
  const account = data ? { ...data, email: user.email ?? "" } as Account : null;
  return { user, account, client };
}

export async function requireAccount() {
  const context = await accountContext();
  if (!context.user) redirect("/login");
  if (!context.account) redirect("/onboarding");
  if (context.account.status !== "active") redirect("/pending");
  return { ...context, account: context.account, client: context.client! };
}

export const json = (value: unknown, status = 200) =>
  Response.json(value, { status, headers: { "Cache-Control": "no-store" } });

export function sameOrigin(req: Request) {
  try {
    const value = req.headers.get("origin");
    if (!value) return false;
    const origin = new URL(value);
    // Next can construct req.url with its internal hostname. The request Host
    // retains the browser-facing hostname, including the local test port.
    const host = req.headers.get("host");
    const protocol = process.env.VERCEL === "1" ? "https:" : new URL(req.url).protocol;
    return !!host && origin.host === host && origin.protocol === protocol &&
      origin.origin === value;
  } catch { return false; }
}

export function databaseError(error: { code?: string; message?: string }) {
  const code = error.code;
  const status = code === "28000" ? 401 : code === "42501" ? 403 : code === "22023" ? 400 : code === "P0001" ? 409 : 503;
  return json({ error: status === 503 ? "The service is unavailable. Please retry." : error.message }, status);
}
