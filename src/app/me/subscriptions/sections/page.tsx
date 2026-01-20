import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { BulkImportSections } from "@/components/bulk-import-sections";
import { ClickableTableRow } from "@/components/clickable-table-row";
import { CopyCalendarLinkButton } from "@/components/copy-calendar-link-button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "@/i18n/routing";
import { generateCalendarSubscriptionJWT } from "@/lib/calendar-jwt";
import { prisma } from "@/lib/prisma";

export default async function SubscriptionsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/signin");
  }

  const t = await getTranslations("subscriptions");
  const tCommon = await getTranslations("common");
  const tProfile = await getTranslations("profile");

  const subscriptions = await prisma.calendarSubscription.findMany({
    where: {
      userId: session.user.id,
    },
    include: {
      sections: {
        include: {
          course: true,
        },
      },
    },
    orderBy: {
      id: "desc",
    },
  });

  // Generate tokens for each subscription
  const subscriptionsWithTokens = await Promise.all(
    subscriptions.map(async (sub) => ({
      ...sub,
      token: await generateCalendarSubscriptionJWT(sub.id),
    })),
  );

  return (
    <main className="page-main">
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/" />}>
              {tCommon("home")}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/me" />}>
              {tProfile("title")}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{t("title")}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mb-8 mt-8">
        <h1 className="text-display mb-2">{t("title")}</h1>
        <p className="text-subtitle text-muted-foreground">
          {t("description")}
        </p>
      </div>

      <BulkImportSections />

      <div className="grid gap-6">
        {subscriptionsWithTokens.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("noSubscriptions")}</CardTitle>
              <CardDescription>
                {t("noSubscriptionsDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button render={<Link href="/courses" />}>
                {t("browseCourses")}
              </Button>
            </CardContent>
          </Card>
        ) : (
          subscriptionsWithTokens.map((sub) => (
            <Card key={sub.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-medium">
                      {t("subscriptionTitle", { id: sub.id })}
                    </CardTitle>
                    <CardDescription>
                      {t("sectionsIncluded", { count: sub.sections.length })}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <CopyCalendarLinkButton
                      url={`/api/calendar-subscriptions/${sub.id}/calendar.ics?token=${sub.token}`}
                      label={t("iCalLink")}
                      copiedMessage={t("linkCopied")}
                      copiedDescription={t("linkCopiedDescription")}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("courseCode")}</TableHead>
                        <TableHead>{t("courseName")}</TableHead>
                        <TableHead>{t("section")}</TableHead>
                        <TableHead>{t("credits")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sub.sections.map((section) => (
                        <ClickableTableRow
                          key={section.jwId}
                          href={`/sections/${section.jwId}`}
                        >
                          <TableCell className="font-medium">
                            {section.course.code}
                          </TableCell>
                          <TableCell>{section.course.nameCn}</TableCell>
                          <TableCell>{section.code}</TableCell>
                          <TableCell>{section.credits}</TableCell>
                        </ClickableTableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </main>
  );
}
