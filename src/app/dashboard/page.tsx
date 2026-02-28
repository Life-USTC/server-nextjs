import { redirect } from "next/navigation";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export default async function DashboardRedirect() {
  const session = await auth();
  if (session?.user?.id) {
    redirect("/");
  }
  redirect("/signin");
}
