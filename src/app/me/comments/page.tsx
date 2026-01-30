import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { CommentMarkdown } from "@/components/comments/comment-markdown";
import { Badge } from "@/components/ui/badge";
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
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Link } from "@/i18n/routing";
import { getPrisma } from "@/lib/prisma";

const PAGE_SIZE = 20;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("myComments");
  return {
    title: t("title"),
  };
}

export default async function MyCommentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/signin");
  }

  const locale = await getLocale();
  const prisma = getPrisma(locale);
  const prismaAny = prisma as typeof prisma & { comment: any };
  const searchP = await searchParams;
  const page = Math.max(parseInt(searchP.page ?? "1", 10) || 1, 1);
  const skip = (page - 1) * PAGE_SIZE;

  const [comments, total] = await Promise.all([
    prismaAny.comment.findMany({
      where: {
        userId: session.user.id,
        status: { in: ["active", "softbanned"] },
      },
      include: {
        homework: {
          include: {
            section: true,
          },
        },
        section: true,
        course: true,
        teacher: true,
        sectionTeacher: {
          include: {
            section: { include: { course: true } },
            teacher: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.comment.count({
      where: {
        userId: session.user.id,
        status: { in: ["active", "softbanned"] },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const t = await getTranslations("myComments");
  const tCommon = await getTranslations("common");

  const buildTargetLabel = (comment: (typeof comments)[number]) => {
    if (comment.homework?.id) {
      const sectionCode = comment.homework.section?.code ?? "";
      const title = comment.homework.title ?? "";
      return [sectionCode, title].filter(Boolean).join(" · ");
    }
    if (comment.sectionTeacher?.section?.jwId) {
      return `${comment.sectionTeacher.section.code} · ${comment.sectionTeacher.teacher?.namePrimary ?? ""}`;
    }
    if (comment.section?.jwId) {
      return comment.section.code ?? tCommon("unknown");
    }
    if (comment.course?.jwId) {
      return (
        comment.course.code ?? comment.course.namePrimary ?? tCommon("unknown")
      );
    }
    if (comment.teacher?.id) {
      return comment.teacher.namePrimary ?? tCommon("unknown");
    }
    return tCommon("unknown");
  };

  const buildTargetHref = (comment: (typeof comments)[number]) => {
    const suffix = `#comment-${comment.id}`;
    if (comment.homework?.section?.jwId) {
      return `/sections/${comment.homework.section.jwId}#homework-${comment.homework.id}`;
    }
    if (comment.sectionTeacher?.section?.jwId) {
      return `/sections/${comment.sectionTeacher.section.jwId}${suffix}`;
    }
    if (comment.section?.jwId) {
      return `/sections/${comment.section.jwId}${suffix}`;
    }
    if (comment.course?.jwId) {
      return `/courses/${comment.course.jwId}${suffix}`;
    }
    if (comment.teacher?.id) {
      return `/teachers/${comment.teacher.id}${suffix}`;
    }
    return `/${suffix}`;
  };

  const buildUrl = (nextPage: number) => {
    const params = new URLSearchParams();
    if (nextPage > 1) {
      params.set("page", String(nextPage));
    }
    const query = params.toString();
    return query ? `/me/comments?${query}` : "/me/comments";
  };

  return (
    <main className="page-main">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">{tCommon("home")}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/me">{tCommon("me")}</BreadcrumbLink>
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

      {comments.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{t("noResults")}</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="space-y-4">
            {comments.map((comment) => (
              <Card key={comment.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base font-medium">
                    <Badge variant="outline" className="font-normal">
                      {buildTargetLabel(comment)}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {new Intl.DateTimeFormat(locale, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(comment.createdAt))}
                  </CardDescription>
                  <CardAction>
                    <Button variant="outline" size="sm">
                      <Link
                        className="no-underline"
                        href={buildTargetHref(comment)}
                      >
                        {t("viewThread")}
                      </Link>
                    </Button>
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <CommentMarkdown content={comment.body} />
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <Pagination className="mt-6">
              <PaginationContent>
                {page > 1 && (
                  <PaginationItem>
                    <PaginationPrevious href={buildUrl(page - 1)} />
                  </PaginationItem>
                )}
                {Array.from({ length: totalPages }, (_, index) => index + 1)
                  .slice(0, 7)
                  .map((pageNum) => (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        href={buildUrl(pageNum)}
                        isActive={pageNum === page}
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                {totalPages > 7 && <PaginationEllipsis />}
                {page < totalPages && (
                  <PaginationItem>
                    <PaginationNext href={buildUrl(page + 1)} />
                  </PaginationItem>
                )}
              </PaginationContent>
            </Pagination>
          )}
        </div>
      )}
    </main>
  );
}
