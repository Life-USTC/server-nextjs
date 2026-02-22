import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
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
  CardDescription,
  CardHeader,
  CardPanel,
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
import { requireSignedInUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

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
  const userId = await requireSignedInUserId();

  const locale = await getLocale();
  type CommentEntry = {
    id: string;
    body: string;
    createdAt: Date;
    homework: {
      id: string;
      title: string | null;
      section: {
        jwId: number | null;
        code: string | null;
      } | null;
    } | null;
    section: {
      jwId: number | null;
      code: string | null;
    } | null;
    course: {
      jwId: number | null;
      code: string | null;
      nameCn: string;
      nameEn: string | null;
    } | null;
    teacher: {
      id: number;
      nameCn: string;
      nameEn: string | null;
    } | null;
    sectionTeacher: {
      section: {
        jwId: number | null;
        code: string | null;
        course: {
          nameCn: string;
          nameEn: string | null;
        } | null;
      } | null;
      teacher: {
        nameCn: string;
        nameEn: string | null;
      } | null;
    } | null;
  };

  const localizedName = (item: { nameCn: string; nameEn: string | null }) =>
    locale === "en-us" ? (item.nameEn ?? item.nameCn) : item.nameCn;
  const searchP = await searchParams;
  const page = Math.max(parseInt(searchP.page ?? "1", 10) || 1, 1);
  const skip = (page - 1) * PAGE_SIZE;

  const [comments, total, t, tCommon, tMe] = await Promise.all([
    prisma.comment.findMany({
      where: {
        userId,
        status: { in: ["active", "softbanned"] },
      },
      include: {
        homework: {
          select: {
            id: true,
            title: true,
            section: {
              select: { jwId: true, code: true },
            },
          },
        },
        section: {
          select: { jwId: true, code: true },
        },
        course: {
          select: { jwId: true, code: true, nameCn: true, nameEn: true },
        },
        teacher: {
          select: { id: true, nameCn: true, nameEn: true },
        },
        sectionTeacher: {
          select: {
            section: {
              select: {
                jwId: true,
                code: true,
                course: {
                  select: { nameCn: true, nameEn: true },
                },
              },
            },
            teacher: {
              select: { nameCn: true, nameEn: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
    }) as Promise<CommentEntry[]>,
    prisma.comment.count({
      where: {
        userId,
        status: { in: ["active", "softbanned"] },
      },
    }),
    getTranslations("myComments"),
    getTranslations("common"),
    getTranslations("meDashboard"),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const buildTargetLabel = (comment: CommentEntry) => {
    if (comment.homework?.id) {
      const sectionCode = comment.homework.section?.code ?? "";
      const title = comment.homework.title ?? "";
      return [sectionCode, title].filter(Boolean).join(" · ");
    }
    if (comment.sectionTeacher?.section?.jwId) {
      return `${comment.sectionTeacher.section.code} · ${comment.sectionTeacher.teacher ? localizedName(comment.sectionTeacher.teacher) : ""}`;
    }
    if (comment.section?.jwId) {
      return comment.section.code ?? tCommon("unknown");
    }
    if (comment.course?.jwId) {
      return (
        comment.course.code ??
        localizedName(comment.course) ??
        tCommon("unknown")
      );
    }
    if (comment.teacher?.id) {
      return localizedName(comment.teacher) ?? tCommon("unknown");
    }
    return tCommon("unknown");
  };

  const buildTargetHref = (comment: CommentEntry) => {
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
    return query ? `/dashboard/comments?${query}` : "/dashboard/comments";
  };

  return (
    <main className="page-main">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/" />}>
              {tCommon("home")}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/dashboard" />}>
              {tMe("title")}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{t("title")}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mt-8 mb-8">
        <h1 className="mb-2 text-display">{t("title")}</h1>
        <p className="text-muted-foreground text-subtitle">
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
            {comments.map((comment: CommentEntry) => (
              <Card key={comment.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-medium text-base">
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
                <CardPanel>
                  <CommentMarkdown content={comment.body} />
                </CardPanel>
              </Card>
            ))}
          </div>

          {totalPages > 1 ? (
            <Pagination className="mt-6">
              <PaginationContent>
                {page > 1 ? (
                  <PaginationItem>
                    <PaginationPrevious href={buildUrl(page - 1)} />
                  </PaginationItem>
                ) : null}
                {(() => {
                  const maxVisible = 7;
                  const half = Math.floor(maxVisible / 2);
                  let start = Math.max(1, page - half);
                  const end = Math.min(totalPages, start + maxVisible - 1);
                  start = Math.max(1, end - maxVisible + 1);
                  const pages: number[] = [];
                  for (let i = start; i <= end; i++) pages.push(i);
                  return (
                    <>
                      {start > 1 ? (
                        <>
                          <PaginationItem>
                            <PaginationLink href={buildUrl(1)}>
                              1
                            </PaginationLink>
                          </PaginationItem>
                          {start > 2 ? <PaginationEllipsis /> : null}
                        </>
                      ) : null}
                      {pages.map((pageNum) => (
                        <PaginationItem key={pageNum}>
                          <PaginationLink
                            href={buildUrl(pageNum)}
                            isActive={pageNum === page}
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      {end < totalPages ? (
                        <>
                          {end < totalPages - 1 ? <PaginationEllipsis /> : null}
                          <PaginationItem>
                            <PaginationLink href={buildUrl(totalPages)}>
                              {totalPages}
                            </PaginationLink>
                          </PaginationItem>
                        </>
                      ) : null}
                    </>
                  );
                })()}
                {page < totalPages ? (
                  <PaginationItem>
                    <PaginationNext href={buildUrl(page + 1)} />
                  </PaginationItem>
                ) : null}
              </PaginationContent>
            </Pagination>
          ) : null}
        </div>
      )}
    </main>
  );
}
