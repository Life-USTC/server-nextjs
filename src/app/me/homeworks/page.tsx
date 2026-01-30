import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { HomeworkSummaryList } from "@/components/homeworks/homework-summary-list";
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
import { Link } from "@/i18n/routing";
import { getPrisma } from "@/lib/prisma";

type HomeworkWithSection = {
  id: string;
  title: string;
  isMajor: boolean;
  requiresTeam: boolean;
  publishedAt: Date | null;
  submissionStartAt: Date | null;
  submissionDueAt: Date | null;
  createdAt: Date;
  description: { content: string } | null;
  section: {
    jwId: number | null;
    code: string | null;
    course: { namePrimary: string | null } | null;
    semester: { namePrimary: string | null } | null;
  } | null;
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");

  return {
    title: t("pages.homeworks"),
  };
}

export default async function MyHomeworksPage() {
  const locale = await getLocale();
  const prisma = getPrisma(locale);
  const prismaAny = prisma as typeof prisma & {
    calendarSubscription: any;
    homework: any;
  };
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/signin");
  }

  const tCommon = await getTranslations("common");
  const tProfile = await getTranslations("profile");
  const tMyHomeworks = await getTranslations("myHomeworks");

  const subscriptions = await prismaAny.calendarSubscription.findMany({
    where: { userId: session.user.id },
    include: { sections: { select: { id: true } } },
  });

  const sectionIds = Array.from(
    new Set(
      subscriptions.flatMap((sub: { sections: Array<{ id: number }> }) =>
        sub.sections.map((section: { id: number }) => section.id),
      ),
    ),
  );

  const homeworks: HomeworkWithSection[] = sectionIds.length
    ? await prismaAny.homework.findMany({
        where: { sectionId: { in: sectionIds }, deletedAt: null },
        include: {
          description: { select: { content: true } },
          section: {
            include: { course: true, semester: true },
          },
        },
        orderBy: [{ submissionDueAt: "asc" }, { createdAt: "desc" }],
      })
    : [];

  const homeworkSummaries = homeworks.map((homework) => ({
    id: homework.id,
    title: homework.title,
    isMajor: homework.isMajor,
    requiresTeam: homework.requiresTeam,
    publishedAt: homework.publishedAt?.toISOString() ?? null,
    submissionStartAt: homework.submissionStartAt?.toISOString() ?? null,
    submissionDueAt: homework.submissionDueAt?.toISOString() ?? null,
    createdAt: homework.createdAt.toISOString(),
    description: homework.description?.content ?? null,
    section: homework.section
      ? {
          jwId: homework.section.jwId ?? null,
          code: homework.section.code ?? null,
          courseName: homework.section.course?.namePrimary ?? null,
          semesterName: homework.section.semester?.namePrimary ?? null,
        }
      : null,
  }));

  return (
    <main className="page-main">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">{tCommon("home")}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/me">{tProfile("title")}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{tMyHomeworks("title")}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mb-8 mt-8">
        <h1 className="text-display mb-2">{tMyHomeworks("title")}</h1>
        <p className="text-subtitle text-muted-foreground">
          {tMyHomeworks("description")}
        </p>
      </div>

      {sectionIds.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{tMyHomeworks("noSubscriptions")}</CardTitle>
            <CardDescription>
              {tMyHomeworks("noSubscriptionsDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button render={<Link href="/courses" />}>
              {tCommon("browseCourses")}
            </Button>
          </CardContent>
        </Card>
      ) : homeworks.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{tMyHomeworks("emptyTitle")}</CardTitle>
            <CardDescription>
              {tMyHomeworks("emptyDescription")}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <HomeworkSummaryList homeworks={homeworkSummaries} />
      )}
    </main>
  );
}
