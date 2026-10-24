import CampusApp from "./campus-app";
import { requireAccount } from "@/lib/account";
export const dynamic = "force-dynamic";
export default async function Home() {
  const { account } = await requireAccount();
  return <CampusApp key={account.userId} account={account} />;
}
