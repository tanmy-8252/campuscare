import { z } from "zod";
<<<<<<< HEAD
import { getDemoUser } from "@/app/demo-session";
import { readWorkspace, saveWorkspace } from "@/lib/workspace-store";
=======
import { getDb } from "@/db";
import { workspaces, users } from "@/db/schema";
import { getSession } from "@/app/auth";
import { getChatGPTUser } from "@/app/chatgpt-auth";
>>>>>>> d998994 (first commit)
import { categories, zones, seedWorkspace, type Workspace } from "@/app/domain";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const json = (v: unknown, status = 200) =>
  Response.json(v, { status, headers: { "Cache-Control": "no-store" } });
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
  z.object({
    action: z.literal("addWorker"),
    name: text.max(80),
    specialty: z.enum(categories),
    phone: z.string().trim().max(30),
  }),
]);
<<<<<<< HEAD
function validPhoto(value: string | null | undefined) {
  if (!value) return true;
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
=======

/**
 * Get the authenticated user from either individual auth (Better Auth) or ChatGPT OAuth
 * Returns { userId, internalUserId, email, name } or null
 */
async function getAuthenticatedUser(): Promise<{
  userId: string;
  internalUserId: string;
  email: string;
  name: string | null;
} | null> {
  // Try individual auth (Better Auth) first
  const session = await getSession();
  if (session?.user) {
    const db = getDb();
    const userRecord = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        chatGptUserId: users.chatGptUserId,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (userRecord[0]) {
      return {
        userId: userRecord[0].chatGptUserId || session.user.id,
        internalUserId: session.user.id,
        email: session.user.email,
        name: session.user.name,
      };
    }
  }

  // Fall back to ChatGPT OAuth
  const chatGPTUser = await getChatGPTUser();
  if (chatGPTUser) {
    // Check if this ChatGPT user has a linked internal account
    const db = getDb();
    const userRecord = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
      })
      .from(users)
      .where(eq(users.chatGptUserId, chatGPTUser.userId))
      .limit(1);

    if (userRecord[0]) {
      return {
        userId: chatGPTUser.userId,
        internalUserId: userRecord[0].id,
        email: chatGPTUser.email,
        name: chatGPTUser.fullName ?? chatGPTUser.displayName,
      };
    }

    // Legacy: use ChatGPT user ID directly
    return {
      userId: chatGPTUser.userId,
      internalUserId: chatGPTUser.userId,
      email: chatGPTUser.email,
      name: chatGPTUser.fullName ?? chatGPTUser.displayName,
    };
  }

  return null;
}

async function getRecord(userId: string, internalUserId?: string) {
  const db = getDb();

  // First try to find workspace by internal user ID (new system)
  if (internalUserId) {
    let record = (
      await db.select().from(workspaces).where(eq(workspaces.userId, internalUserId))
    )[0];

    if (!record) {
      // Create new workspace linked to internal user
      await db
        .insert(workspaces)
        .values({ ownerId: userId, userId: internalUserId, data: JSON.stringify(seedWorkspace()), version: 0 })
        .onConflictDoNothing();
      record = (
        await db.select().from(workspaces).where(eq(workspaces.userId, internalUserId))
      )[0];
    }
    return record;
  }

  // Legacy: find by ChatGPT user ID (ownerId)
  let record = (
    await db.select().from(workspaces).where(eq(workspaces.ownerId, userId))
  )[0];

  if (!record) {
    await db
      .insert(workspaces)
      .values({ ownerId: userId, data: JSON.stringify(seedWorkspace()), version: 0 })
      .onConflictDoNothing();
    record = (
      await db.select().from(workspaces).where(eq(workspaces.ownerId, userId))
    )[0];
  }

  return record;
}

function validPhoto(value: string | null | undefined) {
  if (!value) return true;
  const cloud = (env as unknown as Record<string, string>).CLOUDINARY_CLOUD_NAME;
>>>>>>> d998994 (first commit)
  if (!cloud) return false;
  try {
    const u = new URL(value);
    return (
      u.protocol === "https:" &&
      u.hostname === "res.cloudinary.com" &&
      u.pathname.startsWith("/" + cloud + "/image/upload/")
    );
  } catch {
    return false;
  }
}

export async function GET() {
<<<<<<< HEAD
  const user = await getDemoUser(true);
  if (!user)
    return json({ error: "Open the app to start a demo session." }, 401);
  try {
    const r = await readWorkspace(user.userId);
    const e = process.env;
    return json({
      ...r.data,
=======
  const authUser = await getAuthenticatedUser();
  if (!authUser) return json({ error: "Sign in to open your workspace." }, 401);

  try {
    const record = await getRecord(authUser.userId, authUser.internalUserId);
    const e = env as unknown as Record<string, string>;
    return json({
      ...JSON.parse(record.data),
>>>>>>> d998994 (first commit)
      cloudinaryReady: !!(
        e.CLOUDINARY_CLOUD_NAME &&
        e.CLOUDINARY_API_KEY &&
        e.CLOUDINARY_API_SECRET
      ),
    });
  } catch {
    return json(
      { error: "The workspace could not be loaded. Please retry." },
      503,
    );
  }
}

export async function POST(req: Request) {
<<<<<<< HEAD
  const user = await getDemoUser();
  if (!user)
    return json({ error: "Open the app to start a demo session." }, 401);
=======
  const authUser = await getAuthenticatedUser();
  if (!authUser) return json({ error: "Sign in to make changes." }, 401);

>>>>>>> d998994 (first commit)
  if (
    req.headers.get("origin") &&
    req.headers.get("origin") !== new URL(req.url).origin
  )
    return json({ error: "Request origin rejected." }, 403);

  let a: z.infer<typeof actionSchema>;
  try {
    a = actionSchema.parse(await req.json());
  } catch {
    return json({ error: "Please check the required fields." }, 400);
  }

  if ("photo" in a && !validPhoto(a.photo))
    return json(
      { error: "Please upload a photo through Cloudinary first." },
      400,
    );

  try {
    for (let attempt = 0; attempt < 4; attempt++) {
<<<<<<< HEAD
      const record = await readWorkspace(user.userId);
      const data: Workspace = record.data;
=======
      const record = await getRecord(authUser.userId, authUser.internalUserId);
      const data: Workspace = JSON.parse(record.data);
>>>>>>> d998994 (first commit)
      const at = new Date().toISOString();

      if (a.action === "create") {
        const next =
          Math.max(
            1042,
            ...data.issues.map((i) => Number(i.id.replace("CC-", "")) || 0),
          ) + 1;
        data.issues.unshift({
          id: "CC-" + next,
          title: a.title,
          category: a.category,
          zone: a.zone,
          location: a.location,
          description: a.description,
          priority: a.priority,
          status: "Reported",
          reporter: "You",
          workerId: null,
          photo: a.photo ?? null,
          completionPhoto: null,
          note: "",
          createdAt: at,
          updatedAt: at,
          supporters: [],
          history: [{ text: "Issue reported", at }],
        });
      } else if (a.action === "addWorker")
        data.workers.push({
          id: crypto.randomUUID(),
          name: a.name,
          specialty: a.specialty,
          phone: a.phone,
        });
      else {
        const issue = data.issues.find((i) => i.id === a.id);
        if (!issue) return json({ error: "Issue not found." }, 404);
        let message = "";
        if (a.action === "assign") {
          if (["Resolved", "Confirmed"].includes(issue.status))
            return json(
              { error: "Reopen the issue before assigning it." },
              409,
            );
          const w = data.workers.find((w) => w.id === a.workerId);
          if (!w)
            return json({ error: "Choose an existing team member." }, 400);
          if (w.specialty !== issue.category && w.specialty !== "Other")
            return json(
              { error: "Choose a worker with the matching specialty." },
              400,
            );
          issue.workerId = w.id;
          issue.status = "Assigned";
          issue.priority = a.priority;
          message = "Assigned to " + w.name;
        } else if (a.action === "start") {
          if (issue.status !== "Assigned" || issue.workerId !== a.workerId)
            return json(
              { error: "This job is not assigned to the selected worker." },
              409,
            );
          issue.status = "In progress";
          message = "Work started";
        } else if (a.action === "resolve") {
          if (issue.status !== "In progress" || issue.workerId !== a.workerId)
            return json(
              { error: "Start your assigned job before completing it." },
              409,
            );
          issue.status = "Resolved";
          issue.note = a.note;
          issue.completionPhoto = a.photo ?? null;
          message = "Repair completed: " + a.note;
        } else if (a.action === "confirm") {
          // For individual auth, check if the current user is the reporter
          const isReporter = issue.reporter === "You" || issue.reporter === authUser.email || issue.reporter === authUser.name;
          if (!isReporter || issue.status !== "Resolved")
            return json(
              { error: "Only your resolved reports can be confirmed." },
              409,
            );
          issue.status = "Confirmed";
          message = "Reporter confirmed the repair";
        } else if (a.action === "reopen") {
          const isReporter = issue.reporter === "You" || issue.reporter === authUser.email || issue.reporter === authUser.name;
          if (
            !isReporter ||
            !["Resolved", "Confirmed"].includes(issue.status)
          )
            return json(
              { error: "Only your completed reports can be reopened." },
              409,
            );
          issue.status = "Reported";
          issue.workerId = null;
          message = "Reporter reopened the issue: " + a.note;
        } else if (a.action === "support") {
          if (["Resolved", "Confirmed"].includes(issue.status))
            return json(
              { error: "This issue has already been completed." },
              409,
            );
          const isReporter = issue.reporter === "You" || issue.reporter === authUser.email || issue.reporter === authUser.name;
          if (isReporter)
            return json({ error: "You already reported this issue." }, 400);
          if (issue.supporters.includes(authUser.userId))
            return json(
              { error: "You have already supported this report." },
              409,
            );
          issue.supporters.push(authUser.userId);
          message = "Another campus member is affected";
        }
        issue.updatedAt = at;
        issue.history.push({ text: message, at });
      }
<<<<<<< HEAD
      if (await saveWorkspace(user.userId, data, record.version))
        return json({ ok: true });
=======

      const result = await getDb()
        .update(workspaces)
        .set({ data: JSON.stringify(data), version: record.version + 1 })
        .where(
          and(
            eq(workspaces.userId, authUser.internalUserId),
            eq(workspaces.version, record.version),
          ),
        )
        .returning({ version: workspaces.version });

      if (result.length) return json({ ok: true });
>>>>>>> d998994 (first commit)
    }
    return json({ error: "The workspace changed. Please retry." }, 409);
  } catch {
    return json(
      { error: "Your change could not be saved. Please retry." },
      503,
    );
  }
}