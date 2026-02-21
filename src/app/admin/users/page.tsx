import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/routing";
import { requireSignedInUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

const AdminUsersTable = dynamic(() =>
  import("@/components/admin/admin-users-table").then(
    (mod) => mod.AdminUsersTable,
  ),
);

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
  const userId = await requireSignedInUserId();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });
  const isAdmin = user?.isAdmin ?? false;
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

  const [users, total, t, tCommon, tAdmin] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        username: true,
        isAdmin: true,
        createdAt: true,
        verifiedEmails: { select: { email: true }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.user.count({ where }),
    getTranslations("adminUsers"),
    getTranslations("common"),
    getTranslations("admin"),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

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

      <div className="mt-8 mb-8">
        <h1 className="mb-2 text-display">{t("title")}</h1>
        <p className="text-muted-foreground text-subtitle">{t("subtitle")}</p>
      </div>

      <Form
        className="mb-6 flex flex-wrap gap-3"
        action="/admin/users"
        method="get"
      >
        <Field className="min-w-64 max-w-md flex-1">
          <FieldLabel className="sr-only">{tCommon("search")}</FieldLabel>
          <Input
            name="search"
            defaultValue={search}
            placeholder={t("searchPlaceholder")}
            className="w-full"
          />
        </Field>
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
      </Form>

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
