import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");

  return {
    title: t("pages.privacy"),
  };
}

type LegalSection = { title: string; items: string[] };

export default async function PrivacyPolicyPage() {
  const t = await getTranslations("legal.privacy");
  const sections = t.raw("sections") as LegalSection[];

  return (
    <main className="page-main">
      <div className="mx-auto w-full max-w-3xl space-y-8 py-8">
        <header className="space-y-3">
          <h1 className="text-display">{t("title")}</h1>
          <p className="text-muted-foreground text-subtitle">{t("intro")}</p>
        </header>

        {sections.map((section) => (
          <section key={section.title} className="space-y-3">
            <h2 className="text-title-2">{section.title}</h2>
            <ul className="list-disc space-y-2 pl-6 text-body text-muted-foreground">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
