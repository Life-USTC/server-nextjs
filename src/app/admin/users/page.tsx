import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { AdminUsersTable } from "@/components/admin/admin-users-table";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 30;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminUsers");
  return {
    title: t("title"),
  };
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/signin");
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  const isAdmin = (user as { isAdmin?: boolean } | null)?.isAdmin ?? false;
  if (!isAdmin) {
    notFound();
  }

  const searchP = await searchParams;
  const page = Math.max(parseInt(searchP.page ?? "1", 10) || 1, 1);
  const search = searchP.search?.trim() ?? "";
  const skip = (page - 1) * PAGE_SIZE;

  const where = search
    ? {
        OR: [
          { id: { contains: search, mode: "insensitive" as const } },
          { name: { contains: search, mode: "insensitive" as const } },
          { username: { contains: search, mode: "insensitive" as const } },
          {
            verifiedEmails: {
              some: {
                email: { contains: search, mode: "insensitive" as const },
              },
            },
          },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        verifiedEmails: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.user.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const t = await getTranslations("adminUsers");
  const tCommon = await getTranslations("common");
  const tAdmin = await getTranslations("admin");

  return (
    <main className="page-main">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">{tCommon("home")}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin">{tAdmin("title")}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{t("title")}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mb-8 mt-8">
        <h1 className="text-display mb-2">{t("title")}</h1>
        <p className="text-subtitle text-muted-foreground">{t("subtitle")}</p>
      </div>

      <form
        className="mb-6 flex flex-wrap gap-3"
        action="/admin/users"
        method="get"
      >
        <Input
          name="search"
          defaultValue={search}
          placeholder={t("searchPlaceholder")}
          className="max-w-md"
        />
        <Button type="submit" variant="outline">
          {tCommon("search")}
        </Button>
        {search ? (
          <Button
            type="button"
            variant="ghost"
            render={<Link className="no-underline" href="/admin/users" />}
          >
            {tCommon("clear")}
          </Button>
        ) : null}
      </form>

      <AdminUsersTable
        users={users.map((entry) => ({
          id: entry.id,
          name: entry.name,
          username: entry.username,
          isAdmin: entry.isAdmin,
          email: entry.verifiedEmails?.[0]?.email ?? null,
          createdAt: entry.createdAt.toISOString(),
        }))}
        total={total}
        page={page}
        totalPages={totalPages}
        search={search}
      />
    </main>
  );
}
