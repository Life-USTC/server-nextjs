"use client";

import { GraduationCap, Mail, User } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { PageHeader } from "@/components/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { Link } from "@/i18n/routing";

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const t = useTranslations("common");
  const tMe = useTranslations("me");
  const locale = useLocale();

  if (loading) {
    return (
      <main className="page-main">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="page-main">
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold mb-4">
            {tMe("notSignedIn.title")}
          </h1>
          <p className="text-muted-foreground mb-8">
            {tMe("notSignedIn.message")}
          </p>
          <Link href="/api/auth/signin">
            <Button>{tMe("notSignedIn.title")}</Button>
          </Link>
        </div>
      </main>
    );
  }

  const breadcrumbs = [{ label: t("home"), href: "/" }, { label: t("me") }];

  return (
    <main className="page-main">
      <PageHeader
        title={t("me")}
        subtitle={tMe("pageSubtitle")}
        breadcrumbs={breadcrumbs}
      />

      <div className="max-w-4xl mx-auto grid grid-cols-1 gap-6 mb-8">
        {/* Profile Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user.avatar || undefined} alt={user.name} />
                <AvatarFallback>
                  {user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl">{user.name}</CardTitle>
                <p className="text-muted-foreground">{user.email}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                <span>{tMe("profileCard.title")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                <span>{user.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-primary" />
                <span>{tMe("profileCard.status")}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Information */}
        <Card>
          <CardHeader>
            <CardTitle>{tMe("accountInformation.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  {tMe("accountInformation.fields.name")}
                </p>
                <p className="font-medium">{user.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  {tMe("accountInformation.fields.email")}
                </p>
                <p className="font-medium">{user.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  {tMe("accountInformation.fields.language")}
                </p>
                <p className="font-medium capitalize">
                  {locale === "zh-cn" ? "中文" : "English"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  {tMe("accountInformation.fields.accountType")}
                </p>
                <p className="font-medium">
                  {tMe("accountInformation.fields.cas")}
                </p>
              </div>
            </div>
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                {tMe("accountInformation.casDescription")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
