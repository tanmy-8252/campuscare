import AuthForm from "../auth-ui";
import { supabaseConfigured } from "@/lib/supabase/server";
import { signInNotice } from "@/lib/google-intent";

export const dynamic = "force-dynamic";
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const { message } = await searchParams;
  return <AuthForm mode="login" configured={supabaseConfigured()} initialNotice={signInNotice(message)} />;
}
