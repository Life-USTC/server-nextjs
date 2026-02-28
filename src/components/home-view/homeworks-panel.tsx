import { getTranslations } from "next-intl/server";
import type {
  HomeworkSummaryItem,
  SectionOption,
} from "@/app/dashboard/dashboard-data";
import { HomeworkSummaryList } from "@/components/homeworks/homework-summary-list";
import { Button } from "@/components/ui/button";
import {
  CardDescription,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card";
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
      <div className="flex flex-col gap-6">
        <CardHeader>
          <CardTitle>{t("noSubscriptions")}</CardTitle>
          <CardDescription>{t("noSubscriptionsDescription")}</CardDescription>
        </CardHeader>
        <CardPanel>
          <Button render={<Link className="no-underline" href="/courses" />}>
            {tCommon("browseCourses")}
          </Button>
        </CardPanel>
      </div>
    );
  }

  return (
    <HomeworkSummaryList homeworks={homeworkSummaries} sections={sections} />
  );
}
