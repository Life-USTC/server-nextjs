import type { useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardDescription,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card";
import type { ProfileData } from "./profile-data";

type ProfileViewProps = {
  data: ProfileData;
  locale: string;
  t: ReturnType<typeof useTranslations>;
  /** Whether to show the user ID (used by /u/id/[uid]) */
  showUserId?: boolean;
};

export function ProfileView({
  data,
  locale,
  t,
  showUserId = false,
}: ProfileViewProps) {
  const { user, sectionCount, weeks, totalContributions } = data;
  const formatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  const colorForCount = (count: number) => {
    if (count <= 0) return "bg-muted/40";
    if (count === 1) return "bg-emerald-200";
    if (count <= 3) return "bg-emerald-400";
    if (count <= 6) return "bg-emerald-600";
    return "bg-emerald-800";
  };

  return (
    <main className="page-main">
      <div className="mt-8 grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user.image ?? ""} />
                <AvatarFallback>
                  {(user.name ?? user.username ?? "U").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <CardTitle className="truncate">
                  {showUserId
                    ? (user.name ?? user.username ?? t("idLabel"))
                    : (user.name ?? user.username)}
                </CardTitle>
                {showUserId ? (
                  user.username ? (
                    <CardDescription className="truncate">
                      @{user.username}
                    </CardDescription>
                  ) : null
                ) : (
                  <CardDescription className="truncate">
                    @{user.username}
                  </CardDescription>
                )}
              </div>
            </div>
          </CardHeader>
          <CardPanel className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              {t("joinedAt", { date: formatter.format(user.createdAt) })}
            </p>
            {showUserId ? (
              <p className="text-muted-foreground">
                {t("idLabel")}: {user.id}
              </p>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border p-3">
                <p className="text-muted-foreground text-xs">
                  {t("stats.sections")}
                </p>
                <p className="font-semibold text-xl">{sectionCount}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-muted-foreground text-xs">
                  {t("stats.comments")}
                </p>
                <p className="font-semibold text-xl">{user._count.comments}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-muted-foreground text-xs">
                  {t("stats.uploads")}
                </p>
                <p className="font-semibold text-xl">{user._count.uploads}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-muted-foreground text-xs">
                  {t("stats.homeworks")}
                </p>
                <p className="font-semibold text-xl">
                  {user._count.homeworksCreated}
                </p>
              </div>
            </div>
          </CardPanel>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {t("contribution.title", { count: totalContributions })}
            </CardTitle>
            <CardDescription>{t("contribution.description")}</CardDescription>
          </CardHeader>
          <CardPanel>
            <div className="overflow-x-auto pb-2">
              <div className="inline-flex gap-1">
                {weeks.map((week, weekIndex) => (
                  <div
                    key={week[0]?.date ?? `week-${weekIndex}`}
                    className="flex flex-col gap-1"
                  >
                    {week.map((day) => (
                      <div
                        key={day.date}
                        className={`${colorForCount(day.count)} h-3.5 w-3.5 rounded-[2px]`}
                        title={t("contribution.cell", {
                          count: day.count,
                          date: formatter.format(new Date(day.date)),
                        })}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2 text-muted-foreground text-xs">
              <span>{t("contribution.less")}</span>
              <span className="h-3 w-3 rounded-[2px] bg-muted/40" />
              <span className="h-3 w-3 rounded-[2px] bg-emerald-200" />
              <span className="h-3 w-3 rounded-[2px] bg-emerald-400" />
              <span className="h-3 w-3 rounded-[2px] bg-emerald-600" />
              <span className="h-3 w-3 rounded-[2px] bg-emerald-800" />
              <span>{t("contribution.more")}</span>
            </div>
            {totalContributions === 0 ? (
              <p className="mt-4 text-muted-foreground text-sm">
                {t("contribution.empty")}
              </p>
            ) : null}
          </CardPanel>
        </Card>
      </div>
    </main>
  );
}
