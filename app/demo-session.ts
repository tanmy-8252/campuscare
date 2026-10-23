import { cookies } from "next/headers";
import { randomBytes, createHash } from "node:crypto";

const cookieName = "campuscare_demo_session";
export async function getDemoUser(create = false) {
  const jar = await cookies();
  const existing = jar.get(cookieName)?.value;
  if (existing && /^[a-f0-9]{64}$/.test(existing))
    return { userId: createHash("sha256").update(existing).digest("hex") };
  if (!create) return null;
  const userId = randomBytes(32).toString("hex");
  jar.set(cookieName, userId, {
    httpOnly: true,
    secure: process.env.VERCEL === "1",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return { userId: createHash("sha256").update(userId).digest("hex") };
}
