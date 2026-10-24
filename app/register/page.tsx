import AuthForm from "../auth-ui";
import { supabaseConfigured } from "@/lib/supabase/server";

export default function RegisterPage() {
  return <AuthForm mode="register" configured={supabaseConfigured()} />;
}
