import { accountContext, sameOrigin } from "@/lib/account";
export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "Request origin rejected." }, { status: 403 });
  const { user, account } = await accountContext();
  if (!user)
    return Response.json(
      { error: "Sign in to upload a photo." },
      { status: 401 },
    );
  if (!account || account.status !== "active")
    return Response.json(
      { error: "Active organisation membership is required." },
      { status: 403 },
    );
  const e = process.env;
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
    folder = "campuscare/" + account.organisation.id + "/" + account.userId;
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
