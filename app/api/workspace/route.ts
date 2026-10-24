import { z } from "zod";
import { accountContext, databaseError, json, sameOrigin } from "@/lib/account";
import { categories, zones } from "@/app/domain";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const text = z.string().trim().min(1).max(2000);
const photo = z.string().url().max(1000).nullable().optional();
const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    title: text.max(120),
    category: z.enum(categories),
    zone: z.enum(zones),
    location: text.max(160),
    description: text,
    priority: z.enum(["Low", "Medium", "High"]),
    photo,
  }),
  z.object({
    action: z.literal("assign"),
    id: text,
    workerId: text,
    priority: z.enum(["Low", "Medium", "High"]),
  }),
  z.object({ action: z.literal("start"), id: text, workerId: text }),
  z.object({
    action: z.literal("resolve"),
    id: text,
    workerId: text,
    note: text,
    photo,
  }),
  z.object({ action: z.literal("confirm"), id: text }),
  z.object({ action: z.literal("reopen"), id: text, note: text }),
  z.object({ action: z.literal("support"), id: text }),
]);
function validPhoto(value: string | null | undefined, organisation: string, user: string) {
  if (!value) return true;
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  try {
    const url = new URL(value);
    return !!cloud && url.protocol === "https:" && url.hostname === "res.cloudinary.com" &&
      url.pathname.startsWith("/" + cloud + "/image/upload/") &&
      url.pathname.includes(`/campuscare/${organisation}/${user}/`) && !url.search && !url.hash;
  } catch { return false; }
}
export async function GET() {
  try {
    const { user, account, client } = await accountContext();
    if (!user || !client) return json({ error: "Sign in to continue." }, 401);
    if (!account || account.status !== "active") return json({ error: "Active organisation membership is required." }, 403);
    const { data, error } = await client.rpc("cc_workspace");
    if (error) return databaseError(error);
    return json({ ...data, cloudinaryReady: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) });
  } catch { return json({ error: "The workspace could not be loaded. Please retry." }, 503); }
}
export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "Request origin rejected." }, 403);
  try {
    const { user, account, client } = await accountContext();
    if (!user || !client) return json({ error: "Sign in to continue." }, 401);
    if (!account || account.status !== "active") return json({ error: "Active organisation membership is required." }, 403);
    const parsed = actionSchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: "Check the required fields." }, 400);
    const action = parsed.data;
    if ("photo" in action && !validPhoto(action.photo, account.organisation.id, account.userId))
      return json({ error: "Upload the photo through your organisation first." }, 400);
    const { error } = await client.rpc("cc_apply_action", { p_action: action });
    if (error) return databaseError(error);
    return json({ ok: true });
  } catch { return json({ error: "Your change could not be saved. Please retry." }, 503); }
}
