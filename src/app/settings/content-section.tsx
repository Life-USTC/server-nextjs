import { getTranslations } from "next-intl/server";
import { PageLinkCard, PageLinkGrid } from "@/components/page-layout";

export const dynamic = "force-dynamic";

export async function ContentSettingsSection() {
  const tSettings = await getTranslations("settings");

  return (
    <PageLinkGrid className="xl:grid-cols-2">
      <PageLinkCard
        href="/"
        title={tSettings("content.uploads.title")}
        description={tSettings("content.uploads.description")}
      />
      <PageLinkCard
        href="/"
        title={tSettings("content.comments.title")}
        description={tSettings("content.comments.description")}
      />
    </PageLinkGrid>
  );
}
