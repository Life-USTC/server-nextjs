import {
  BookOpen,
  Calendar,
  ClipboardList,
  Settings,
  UserRound,
} from "lucide-react";
import { Card, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/routing";
import type { Translate } from "../types";

type QuickActionsCardProps = {
  t: Translate;
  userId: string;
  username: string | null;
};

export function QuickActionsCard({
  t,
  userId,
  username,
}: QuickActionsCardProps) {
  const publicProfileHref = username ? `/u/${username}` : `/u/id/${userId}`;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>{t("quickActions")}</CardTitle>
      </CardHeader>
      <CardPanel className="grid gap-2">
        <Link
          href="/dashboard/subscriptions/sections"
          className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm no-underline transition-colors hover:bg-accent/50"
        >
          <BookOpen className="h-4 w-4" />
          {t("links.subscriptions")}
        </Link>
        <Link
          href="/dashboard/homeworks"
          className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm no-underline transition-colors hover:bg-accent/50"
        >
          <ClipboardList className="h-4 w-4" />
          {t("links.homeworks")}
        </Link>
        <Link
          href="/settings/profile"
          className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm no-underline transition-colors hover:bg-accent/50"
        >
          <Settings className="h-4 w-4" />
          {t("links.settings")}
        </Link>
        <Link
          href={publicProfileHref}
          className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm no-underline transition-colors hover:bg-accent/50"
        >
          <UserRound className="h-4 w-4" />
          {username ? t("links.publicProfile") : t("links.publicProfileId")}
        </Link>
        <Link
          href="/dashboard/subscriptions/sections"
          className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm no-underline transition-colors hover:bg-accent/50"
        >
          <Calendar className="h-4 w-4" />
          {t("links.fullSchedule")}
        </Link>
      </CardPanel>
    </Card>
  );
}
