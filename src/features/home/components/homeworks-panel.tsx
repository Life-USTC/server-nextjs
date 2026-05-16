import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import type {
  HomeworkSummaryItem,
  SectionOption,
} from "@/features/home/server/dashboard-tab-data";
import { HomeworkSummaryList } from "@/features/homeworks/components/homework-summary-list";
import { Link } from "@/i18n/routing";

type HomeworksPanelProps = {
  homeworkSummaries: HomeworkSummaryItem[];
  sections: SectionOption[];
  referenceNow?: string | null;
};

export async function HomeworksPanel({
  homeworkSummaries,
  sections,
  referenceNow,
}: HomeworksPanelProps) {
  const t = await getTranslations("myHomeworks");
  const tCommon = await getTranslations("common");

  if (sections.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>{t("noSubscriptions")}</EmptyTitle>
          <EmptyDescription>{t("noSubscriptionsDescription")}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button render={<Link className="no-underline" href="/courses" />}>
            {tCommon("browseCourses")}
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <HomeworkSummaryList
      homeworks={homeworkSummaries}
      sections={sections}
      referenceNow={referenceNow}
    />
  );
}
