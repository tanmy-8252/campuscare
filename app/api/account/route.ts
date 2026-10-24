import { accountContext, databaseError, json, sameOrigin } from "@/lib/account";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import { z } from "zod";

export const dynamic = "force-dynamic";
export async function GET() {
  if (!supabaseConfigured()) return json({ organisations: [], configured: false });
  try {
    const client = await createClient();
    const { data, error } = await client.rpc("cc_directory");
    if (error) return databaseError(error);
    return json({ organisations: data, configured: true });
  } catch { return json({ error: "Organisation list could not be loaded." }, 503); }
}

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), name: z.string().trim().min(2).max(120), kind: z.enum(["College", "Workplace"]), location: z.string().trim().min(2).max(160) }),
  z.object({ action: z.literal("join"), organisationId: z.string().uuid(), code: z.string().trim().min(1).max(64), role: z.enum(["resident", "worker"]), specialty: z.enum(["Electrical", "Plumbing", "Sanitation", "Infrastructure", "Other"]).optional() }),
]);
export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "Request origin rejected." }, 403);
  try {
    const { user, client } = await accountContext();
    if (!user || !client) return json({ error: "Sign in to continue." }, 401);
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return json({ error: "Check your organisation details." }, 400);
    const a = parsed.data;
    const { data, error } = a.action === "create"
      ? await client.rpc("cc_create_organisation", { p_name: a.name, p_kind: a.kind, p_location: a.location })
      : await client.rpc("cc_join_organisation", { p_organisation: a.organisationId, p_code: a.code, p_role: a.role, p_specialty: a.specialty ?? null });
    if (error) return databaseError(error);
    return json({ next: data.status === "active" ? "/" : "/pending" });
  } catch { return json({ error: "Organisation setup could not be completed. Please retry." }, 503); }
}
