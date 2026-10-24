import AuthForm from "../auth-ui";
import { supabaseConfigured } from "@/lib/supabase/server";

export default function ResetPasswordPage() {
  return <AuthForm mode="reset" configured={supabaseConfigured()} />;
}
