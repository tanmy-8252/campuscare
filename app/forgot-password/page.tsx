import AuthForm from "../auth-ui";
import { supabaseConfigured } from "@/lib/supabase/server";

export default function ForgotPasswordPage() {
  return <AuthForm mode="forgot" configured={supabaseConfigured()} />;
}
