import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";
export async function POST(req: Request) {
  const user = await getChatGPTUser();
  if (!user)
    return Response.json({ error: "Sign in to upload." }, { status: 401 });
  if (
    req.headers.get("origin") &&
    req.headers.get("origin") !== new URL(req.url).origin
  )
    return Response.json(
      { error: "Request origin rejected." },
      { status: 403 },
    );
  const e = env as unknown as Record<string, string>;
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
    folder = "campuscare/" + user.userId.replace(/[^a-zA-Z0-9_-]/g, "_");
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
