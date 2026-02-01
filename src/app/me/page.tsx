import {
  Calendar,
  ChevronRight,
  ClipboardList,
  MessageSquare,
  UploadCloud,
} from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { AccountDeletionSection } from "@/components/account-deletion-section";
import { AccountLinkingSection } from "@/components/account-linking-section";
import { ProfileEditForm } from "@/components/profile-edit-form";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Link } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");

  return {
    title: t("pages.profile"),
  };
}

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/signin");
  }

  const t = await getTranslations("profile");
  const tCommon = await getTranslations("common");
  const tSubs = await getTranslations("subscriptions");
  const tUploads = await getTranslations("uploads");
  const tMyComments = await getTranslations("myComments");
  const tMyHomeworks = await getTranslations("myHomeworks");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { verifiedEmails: true, accounts: true },
  });

  if (!user) {
    console.error("Authenticated user not found in database", {
      userId: session.user.id,
    });
    return <div>{tCommon("userNotFound")}</div>;
  }
  return (
    <main className="page-main">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">{tCommon("home")}</BreadcrumbLink>
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <ProfileEditForm user={user} />
          <AccountLinkingSection user={user} />
          <AccountDeletionSection />
        </div>

        <div className="space-y-4">
          <Link
            href="/me/subscriptions/sections"
            className="block no-underline"
          >
            <Card className="transition-colors hover:bg-accent/50">
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <CardTitle>{tSubs("title")}</CardTitle>
                      <CardDescription>{tSubs("description")}</CardDescription>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/me/uploads" className="block no-underline">
            <Card className="transition-colors hover:bg-accent/50">
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <UploadCloud className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <CardTitle>{tUploads("title")}</CardTitle>
                      <CardDescription>
                        {tUploads("description")}
                      </CardDescription>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/me/comments" className="block no-underline">
            <Card className="transition-colors hover:bg-accent/50">
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <CardTitle>{tMyComments("title")}</CardTitle>
                      <CardDescription>
                        {tMyComments("description")}
                      </CardDescription>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/me/homeworks" className="block no-underline">
            <Card className="transition-colors hover:bg-accent/50">
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <ClipboardList className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <CardTitle>{tMyHomeworks("title")}</CardTitle>
                      <CardDescription>
                        {tMyHomeworks("description")}
                      </CardDescription>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </main>
  );
}
