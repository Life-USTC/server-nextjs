import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";

export default async function NotFound() {
  const t = await getTranslations("notFound");

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="mb-4 font-bold text-6xl">404</h1>
        <h2 className="mb-4 font-semibold text-2xl">{t("title")}</h2>
        <p className="mb-4 text-muted-foreground">{t("description")}</p>
        <Button render={<Link href="/" />}>{t("backHome")}</Button>
      </div>
    </div>
  );
}
