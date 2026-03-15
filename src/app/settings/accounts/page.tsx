import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SettingsAccountsPage() {
  redirect("/settings?tab=accounts");
}
