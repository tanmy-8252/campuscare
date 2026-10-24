import AuthForm from "../auth-ui";
import { supabaseConfigured } from "@/lib/supabase/server";

export default function LoginPage() {
  return <AuthForm mode="login" configured={supabaseConfigured()} />;
}
