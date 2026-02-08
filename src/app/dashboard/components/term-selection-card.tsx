import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card";
import { Link } from "@/i18n/routing";
import type { Translate } from "../types";

type TermSelectionCardProps = {
  t: Translate;
  hasAnySelection: boolean;
  currentTermName: string;
};

export function TermSelectionCard({
  t,
  hasAnySelection,
  currentTermName,
}: TermSelectionCardProps) {
  return (
    <Card className="border-warning/40">
      <CardHeader>
        <CardTitle>{t("termSelection.title")}</CardTitle>
        <CardDescription>
          {hasAnySelection
            ? t("termSelection.noCurrentTerm", { term: currentTermName })
            : t("termSelection.noAnySelection")}
        </CardDescription>
      </CardHeader>
      <CardPanel className="flex flex-wrap gap-2">
        <Button
          render={
            <Link
              className="no-underline"
              href="/dashboard/subscriptions/sections"
            />
          }
        >
          {t("termSelection.openSelection")}
        </Button>
        <Button
          variant="outline"
          render={<Link className="no-underline" href="/courses" />}
        >
          {t("termSelection.browseCourses")}
        </Button>
      </CardPanel>
    </Card>
  );
}
