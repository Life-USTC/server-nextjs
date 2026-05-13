import { Search } from "lucide-react";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  PageBreadcrumbs,
  PageLayout,
  PageToolbar,
} from "@/components/page-layout";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { Link } from "@/i18n/routing";
import { requireAdminPage } from "@/lib/admin-utils";
import { prisma } from "@/lib/db/prisma";
import { ilike } from "@/lib/query-helpers";
import { toShanghaiIsoString } from "@/lib/time/serialize-date-output";
import { ADMIN_USERS_PAGE_SIZE } from "./constants";

const AdminUsersTable = dynamic(() =>
  import("@/features/admin/components/admin-users-table").then(
    (mod) => mod.AdminUsersTable,
  ),
);

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
  const searchP = await searchParams;
  const callbackParams = new URLSearchParams();
  if (searchP.page) {
    callbackParams.set("page", searchP.page);
  }
  if (searchP.search) {
    callbackParams.set("search", searchP.search);
  }
  const callbackUrl = callbackParams.size
    ? `/admin/users?${callbackParams.toString()}`
    : "/admin/users";
  const admin = await requireAdminPage(callbackUrl);
  if (!admin) {
    notFound();
  }

  const page = Math.max(parseInt(searchP.page ?? "1", 10) || 1, 1);
  const search = searchP.search?.trim() ?? "";
  const skip = (page - 1) * ADMIN_USERS_PAGE_SIZE;

  const where = search
    ? {
        OR: [
          { id: ilike(search) },
          { name: ilike(search) },
          { username: ilike(search) },
          {
            verifiedEmails: {
              some: {
                email: ilike(search),
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
      take: ADMIN_USERS_PAGE_SIZE,
    }),
    prisma.user.count({ where }),
    getTranslations("adminUsers"),
    getTranslations("common"),
    getTranslations("admin"),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / ADMIN_USERS_PAGE_SIZE));

  return (
    <PageLayout
      title={t("title")}
      description={t("subtitle")}
      breadcrumbs={
        <PageBreadcrumbs
          items={[
            { label: tCommon("home"), href: "/" },
            { label: tAdmin("title"), href: "/admin" },
            { label: t("title") },
          ]}
        />
      }
    >
      <PageToolbar className="space-y-4">
        <Form action="/admin/users" layout="toolbar" method="get">
          <Field className="min-w-64 max-w-xl flex-1">
            <FieldLabel className="sr-only">{tCommon("search")}</FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                <InputGroupText>
                  <Search className="size-4" />
                </InputGroupText>
              </InputGroupAddon>
              <InputGroupInput
                autoComplete="off"
                defaultValue={search}
                inputMode="search"
                name="search"
                placeholder={t("searchPlaceholder")}
                type="search"
              />
            </InputGroup>
          </Field>
          <Button type="submit">{tCommon("search")}</Button>
          {search ? (
            <Button render={<Link href="/admin/users" />} variant="outline">
              {tCommon("clear")}
            </Button>
          ) : null}
        </Form>
      </PageToolbar>
      <AdminUsersTable
        users={users.map((entry) => ({
          id: entry.id,
          name: entry.name,
          username: entry.username,
          isAdmin: entry.isAdmin,
          email: entry.verifiedEmails?.[0]?.email ?? null,
          createdAt: toShanghaiIsoString(entry.createdAt),
        }))}
        total={total}
        page={page}
        totalPages={totalPages}
        search={search}
      />
    </PageLayout>
  );
}
