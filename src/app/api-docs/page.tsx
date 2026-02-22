import type { Metadata } from "next";
import Script from "next/script";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");

  return {
    title: t("pages.apiDocs"),
  };
}

export default async function ApiDocsPage() {
  const t = await getTranslations("apiDocs");

  return (
    <main className="page-main mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <section className="space-y-2">
        <h1 className="font-semibold text-2xl">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
        <div className="text-sm">
          <a
            className="text-primary underline-offset-4 hover:underline"
            href="/api/openapi"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("rawSpecLink")}
          </a>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-2">
        <div id="redoc-container" className="min-h-[60vh]" />
      </section>

      <Script
        src="https://cdn.jsdelivr.net/npm/redoc@next/bundles/redoc.standalone.js"
        strategy="afterInteractive"
      />
      <Script id="redoc-init" strategy="afterInteractive">
        {`if (window.Redoc) { window.Redoc.init('/api/openapi', {}, document.getElementById('redoc-container')); }`}
      </Script>
    </main>
  );
}
