import { Calendar } from "lucide-react";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
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
import { prisma } from "@/lib/prisma";

export default async function SubscriptionsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/api/auth/signin");
  }

  const t = await getTranslations("subscriptions");
  const tCommon = await getTranslations("common");

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
              {tCommon("me")}
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

      <div className="grid gap-6">
        {subscriptions.length === 0 ? (
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
          subscriptions.map((sub) => (
            <Card key={sub.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-medium">
                      Subscription #{sub.id}
                    </CardTitle>
                    <CardDescription>
                      {sub.sections.length} sections included
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      render={
                        <a
                          href={`/api/calendar-subscriptions/${sub.id}/calendar.ics`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <span className="sr-only">Download iCal</span>
                        </a>
                      }
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      iCal Link
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Course Code</TableHead>
                        <TableHead>Course Name</TableHead>
                        <TableHead>Section</TableHead>
                        <TableHead>Credits</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sub.sections.map((section: any) => (
                        <TableRow key={section.id}>
                          <TableCell className="font-medium">
                            {section.course.code}
                          </TableCell>
                          <TableCell>{section.course.nameCn}</TableCell>
                          <TableCell>{section.code}</TableCell>
                          <TableCell>{section.credits}</TableCell>
                        </TableRow>
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
