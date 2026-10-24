import AuthForm from "../auth-ui";
import { accountContext } from "@/lib/account";
import { redirect } from "next/navigation";
import type { Role } from "../domain";

export const dynamic = "force-dynamic";
export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const { user, account } = await accountContext();
  if (!user) redirect("/login");
  if (account) redirect(account.status === "active" ? "/" : "/pending");
  const requested = (await searchParams).role;
  // This preselects the editable form; SQL decides every membership permission.
  const value = requested === "admin" || requested === "resident" || requested === "worker" ? requested : user.user_metadata.onboardingRole;
  const role: Role = value === "admin" || value === "worker" ? value : "resident";
  return <AuthForm mode="onboarding" configured initialRole={role} />;
}
