import { redirect } from "next/navigation";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export default async function DashboardHomeworksRedirect() {
  const session = await auth();
  if (session?.user?.id) {
    redirect("/?tab=homeworks");
  }
  redirect("/signin");
}
