import { accountContext, databaseError, json, sameOrigin } from "@/lib/account";
import { z } from "zod";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const { user, account, client } = await accountContext();
    if (!user || !client) return json({ error: "Sign in to continue." }, 401);
    if (account?.role !== "admin" || account.status !== "active") return json({ error: "Admin access is required." }, 403);
    const { data, error } = await client.rpc("cc_members");
    if (error) return databaseError(error);
    return json(data);
  } catch { return json({ error: "Membership requests could not be loaded." }, 503); }
}
export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "Request origin rejected." }, 403);
  try {
    const { user, account, client } = await accountContext();
    if (!user || !client) return json({ error: "Sign in to continue." }, 401);
    if (account?.role !== "admin" || account.status !== "active") return json({ error: "Admin access is required." }, 403);
    const parsed = z.object({ userId: z.string().uuid(), approve: z.boolean() }).safeParse(await req.json());
    if (!parsed.success) return json({ error: "Choose a valid worker request." }, 400);
    const { error } = await client.rpc("cc_review_worker", { p_user: parsed.data.userId, p_approve: parsed.data.approve });
    if (error) return databaseError(error);
    return json({ ok: true });
  } catch { return json({ error: "The request could not be reviewed." }, 503); }
}
