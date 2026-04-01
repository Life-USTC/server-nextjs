import { getTranslations } from "next-intl/server";
import type {
  HomeworkSummaryItem,
  SectionOption,
} from "@/app/dashboard/dashboard-data";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { HomeworkSummaryList } from "@/features/homeworks/components/homework-summary-list";
import { Link } from "@/i18n/routing";

type HomeworksPanelProps = {
  homeworkSummaries: HomeworkSummaryItem[];
  sections: SectionOption[];
};

export async function HomeworksPanel({
  homeworkSummaries,
  sections,
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
    <HomeworkSummaryList homeworks={homeworkSummaries} sections={sections} />
  );
}
