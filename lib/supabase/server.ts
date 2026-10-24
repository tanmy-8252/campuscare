import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function supabaseConfigured() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY));
}

export async function createClient() {
  if (!supabaseConfigured()) throw new Error("Supabase connection is not configured.");
  const jar = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
    {
      cookieOptions: { httpOnly: true, secure: process.env.VERCEL === "1", sameSite: "lax", path: "/" },
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (items) => {
          // Server Components cannot set cookies; proxy.ts handles refresh there.
          try { items.forEach(({ name, value, options }) => jar.set(name, value, options)); } catch {}
        },
      },
    },
  );
}
