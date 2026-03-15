import type { ReactElement } from "react";
import { AccountSettingsSection } from "./accounts-section";
import { ContentSettingsSection } from "./content-section";
import { DangerSettingsSection } from "./danger-section";
import { ProfileSettingsSection } from "./profile-section";

export const dynamic = "force-dynamic";

type SettingsSearchParams = {
  tab?: string;
};

export default async function SettingsIndexPage({
  searchParams,
}: {
  searchParams: Promise<SettingsSearchParams>;
}) {
  const params = await searchParams;
  const tab = params.tab ?? "profile";

  let content: ReactElement | null;

  switch (tab) {
    case "accounts":
      content = await AccountSettingsSection();
      break;
    case "content":
      content = await ContentSettingsSection();
      break;
    case "danger":
      content = DangerSettingsSection();
      break;
    default:
      content = await ProfileSettingsSection();
      break;
  }

  return content;
}
