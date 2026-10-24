import { AuthFrame, SignOutButton } from "../auth-ui";
import { accountContext } from "@/lib/account";
import { redirect } from "next/navigation";
import { HardHat } from "lucide-react";

export const dynamic = "force-dynamic";
export default async function PendingPage() {
  const { user, account } = await accountContext();
  if (!user) redirect("/login");
  if (!account) redirect("/onboarding");
  if (account.status === "active") redirect("/");
  return <AuthFrame><HardHat size={40} className="account-status-icon" />
    <p className="account-eyebrow">{account.organisation.name}</p>
    <h2>{account.status === "pending" ? "Your request is with the admin." : "Your request was not approved."}</h2>
    <p className="account-intro">{account.status === "pending" ? "Your worker account has been created. Your organisation’s administrator must approve it before you can see or update assigned jobs." : "Contact your organisation’s administrator about your worker access."}</p>
    <form action="/" method="get"><button className="primary account-submit">Check approval status</button></form>
    <div className="account-links"><SignOutButton /></div>
  </AuthFrame>;
}
