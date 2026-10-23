import { auth } from "@/app/auth";
import { redirect } from "next/navigation";

export async function POST() {
  await auth.api.signOut({
    headers: new Headers(),
  });
  redirect("/login");
}