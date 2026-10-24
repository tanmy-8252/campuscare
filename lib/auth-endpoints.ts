import { createClient } from "./supabase/server";
import { json, sameOrigin } from "./account";

export async function logout(req: Request) {
  if (!sameOrigin(req)) return json({ error: "Request origin rejected." }, 403);
  const client = await createClient();
  const { error } = await client.auth.signOut();
  if (error) return json({ error: "Sign out failed. Please retry." }, 503);
  return json({ next: "/login" });
}
