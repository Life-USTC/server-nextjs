import { redirect } from "next/navigation";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export default async function DashboardSubscriptionsRedirect() {
  const session = await auth();
  if (session?.user?.id) {
    redirect("/?tab=subscriptions");
  }
  redirect("/signin");
}
