import { Calendar, User, Users } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Card, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/routing";

export default async function Homepage() {
  const t = await getTranslations("homepage");

  return (
    <main className="page-main">
      {/* Hero Section */}
      <section className="mb-12 md:mb-12 -mx-6 px-6 md:mx-0 md:px-0 min-h-[100dvh] md:min-h-0 flex items-center justify-center animate-in fade-in slide-in-from-left-4 duration-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center w-full py-12">
          <div className="flex justify-center mb-8 md:mb-0 md:order-2 animate-in fade-in slide-in-from-right-4 duration-700 delay-200">
            <div className="relative animate-float">
              <Image
                src="/images/icon.png"
                alt={t("appIconAlt")}
                width={280}
                height={280}
                className="rounded-[25%] shadow-2xl shadow-primary/30"
                priority
              />
            </div>
          </div>

          <div className="space-y-6 md:order-1">
            <h1 className="text-display">
              <span className="block">{t("title.line1")}</span>
              <span className="block bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                {t("title.line2")}
              </span>
            </h1>

            <p className="text-subtitle text-muted-foreground max-w-lg">
              {t("subtitle")}
            </p>

            <div className="flex gap-4">
              <a
                href="https://apps.apple.com/us/app/life-ustc/id1660437438"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-transform hover:scale-105 no-underline"
              >
                <Image
                  src="/images/appstore.svg"
                  alt={t("downloadBadgeAlt")}
                  width={150}
                  height={44}
                  priority
                />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="mb-12 animate-in fade-in duration-700 delay-300">
        <h2 className="text-title-2 mb-6">{t("quickAccess.title")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link href="/sections" className="no-underline">
            <Card className="h-full overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-primary" />
                  <CardTitle>{t("quickAccess.viewSections.title")}</CardTitle>
                </div>
              </CardHeader>
              <CardPanel>
                <p className="text-body text-muted-foreground line-clamp-2">
                  {t("quickAccess.viewSections.description")}
                </p>
              </CardPanel>
            </Card>
          </Link>

          <Link href="/teachers" className="no-underline">
            <Card className="h-full overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-primary" />
                  <CardTitle>{t("quickAccess.browseTeachers.title")}</CardTitle>
                </div>
              </CardHeader>
              <CardPanel>
                <p className="text-body text-muted-foreground line-clamp-2">
                  {t("quickAccess.browseTeachers.description")}
                </p>
              </CardPanel>
            </Card>
          </Link>

          <Link href="/me" className="no-underline">
            <Card className="h-full overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-primary" />
                  <CardTitle>{t("quickAccess.myProfile.title")}</CardTitle>
                </div>
              </CardHeader>
              <CardPanel>
                <p className="text-body text-muted-foreground line-clamp-2">
                  {t("quickAccess.myProfile.description")}
                </p>
              </CardPanel>
            </Card>
          </Link>
        </div>
      </section>
    </main>
  );
}
