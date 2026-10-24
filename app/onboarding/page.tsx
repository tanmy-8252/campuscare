import AuthForm from "../auth-ui";
import { accountContext } from "@/lib/account";
import { redirect } from "next/navigation";
import type { Role } from "../domain";

export const dynamic = "force-dynamic";
export default async function OnboardingPage() {
  const { user, account } = await accountContext();
  if (!user) redirect("/login");
  if (account) redirect(account.status === "active" ? "/" : "/pending");
  const value = user.user_metadata.onboardingRole;
  const role: Role = value === "admin" || value === "worker" ? value : "resident";
  return <AuthForm mode="onboarding" configured initialRole={role} />;
}
