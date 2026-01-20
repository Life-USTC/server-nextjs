import { Calendar, ChevronRight } from "lucide-react";
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

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/signin");
  }

  const t = await getTranslations("profile");
  const tCommon = await getTranslations("common");
  const tSubs = await getTranslations("subscriptions");

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

      <div className="mb-8 mt-8">
        <h1 className="text-display mb-2">{t("title")}</h1>
        <p className="text-subtitle text-muted-foreground">
          {t("description")}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
          <ProfileEditForm user={user} />
          <AccountLinkingSection user={user} />
          <AccountDeletionSection />
        </div>

        <div className="space-y-8">
          <Link
            href="/me/subscriptions/sections"
            className="block no-underline"
          >
            <Card className="hover:bg-accent/50 transition-colors">
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
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
        </div>
      </div>
    </main>
  );
}
