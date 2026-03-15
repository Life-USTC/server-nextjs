import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SettingsProfilePage() {
  redirect("/settings?tab=profile");
}
