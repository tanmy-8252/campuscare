<<<<<<< HEAD
import { getDemoUser } from "@/app/demo-session";
export async function POST(req: Request) {
  const user = await getDemoUser();
  if (!user)
    return Response.json(
      { error: "Open the app to start a demo session." },
      { status: 401 },
    );
=======
import { env } from "cloudflare:workers";
import { getSession } from "@/app/auth";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Get the authenticated user from either individual auth (Better Auth) or ChatGPT OAuth
 */
async function getAuthenticatedUser(): Promise<{
  userId: string;
  internalUserId: string;
} | null> {
  // Try individual auth (Better Auth) first
  const session = await getSession();
  if (session?.user) {
    return {
      userId: session.user.id,
      internalUserId: session.user.id,
    };
  }

  // Fall back to ChatGPT OAuth
  const chatGPTUser = await getChatGPTUser();
  if (chatGPTUser) {
    // Check if this ChatGPT user has a linked internal account
    const db = getDb();
    const userRecord = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.chatGptUserId, chatGPTUser.userId))
      .limit(1);

    if (userRecord[0]) {
      return {
        userId: chatGPTUser.userId,
        internalUserId: userRecord[0].id,
      };
    }

    // Legacy: use ChatGPT user ID directly
    return {
      userId: chatGPTUser.userId,
      internalUserId: chatGPTUser.userId,
    };
  }

  return null;
}

export async function POST(req: Request) {
  const authUser = await getAuthenticatedUser();
  if (!authUser)
    return Response.json({ error: "Sign in to upload." }, { status: 401 });

>>>>>>> d998994 (first commit)
  if (
    req.headers.get("origin") &&
    req.headers.get("origin") !== new URL(req.url).origin
  )
    return Response.json(
      { error: "Request origin rejected." },
      { status: 403 },
    );
<<<<<<< HEAD
  const e = process.env;
=======

  const e = env as unknown as Record<string, string>;
>>>>>>> d998994 (first commit)
  if (
    !e.CLOUDINARY_CLOUD_NAME ||
    !e.CLOUDINARY_API_KEY ||
    !e.CLOUDINARY_API_SECRET
  )
    return Response.json(
      {
        error:
          "Photo uploads need Cloudinary configuration. You can submit your report without a photo for now.",
      },
      { status: 503 },
    );

  const timestamp = Math.floor(Date.now() / 1000),
    folder = "campuscare/" + authUser.internalUserId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const params = {
    allowed_formats: "jpg,jpeg,png,webp,heic",
    folder,
    timestamp,
  };
  const raw =
    "allowed_formats=" +
    params.allowed_formats +
    "&folder=" +
    folder +
    "&timestamp=" +
    timestamp +
    e.CLOUDINARY_API_SECRET;
  const digest = await crypto.subtle.digest(
    "SHA-1",
    new TextEncoder().encode(raw),
  );
  const signature = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return Response.json(
    {
      cloudName: e.CLOUDINARY_CLOUD_NAME,
      apiKey: e.CLOUDINARY_API_KEY,
      signature,
      ...params,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}