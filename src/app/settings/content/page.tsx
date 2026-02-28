import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export default async function SettingsContentPage() {
  const tSettings = await getTranslations("settings");

  return (
    <div className="grid grid-cols-2 gap-4">
      <Link
        href="/"
        className="block rounded-md border px-3 py-3 no-underline transition-colors hover:bg-accent/50"
      >
        <p className="font-medium text-sm">
          {tSettings("content.uploads.title")}
        </p>
        <p className="text-muted-foreground text-xs">
          {tSettings("content.uploads.description")}
        </p>
      </Link>
      <Link
        href="/"
        className="block rounded-md border px-3 py-3 no-underline transition-colors hover:bg-accent/50"
      >
        <p className="font-medium text-sm">
          {tSettings("content.comments.title")}
        </p>
        <p className="text-muted-foreground text-xs">
          {tSettings("content.comments.description")}
        </p>
      </Link>
    </div>
  );
}
