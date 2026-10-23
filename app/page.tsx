import CampusApp from "./campus-app";
<<<<<<< HEAD
export default function Home() {
  return <CampusApp />;
}
=======
import { requireAuth, getUser } from "./auth";
export const dynamic = "force-dynamic";
export default async function Home() {
  const user = await getUser();
  if (!user) {
    // This shouldn't happen since requireAuth would redirect, but just in case
    return null;
  }
  return <CampusApp user={user} />;
}
>>>>>>> d998994 (first commit)
