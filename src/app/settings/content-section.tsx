import { getTranslations } from "next-intl/server";
import {
  PageLinkCard,
  PageLinkGrid,
  PageSection,
} from "@/components/page-layout";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

export const dynamic = "force-dynamic";

export async function ContentSettingsSection() {
  const tSettings = await getTranslations("settings");

  return (
    <PageSection
      title={tSettings("content.title")}
      description={tSettings("content.description")}
    >
      <div className="space-y-5">
        <Empty variant="inset">
          <EmptyHeader>
            <EmptyTitle>{tSettings("content.emptyTitle")}</EmptyTitle>
            <EmptyDescription>
              {tSettings("content.emptyDescription")}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
        <PageLinkGrid className="xl:grid-cols-2">
          <PageLinkCard
            href="/sections"
            title={tSettings("content.browseSections.title")}
            description={tSettings("content.browseSections.description")}
          />
          <PageLinkCard
            href="/guides/markdown-support"
            title={tSettings("content.commentGuide.title")}
            description={tSettings("content.commentGuide.description")}
          />
        </PageLinkGrid>
      </div>
    </PageSection>
  );
}
