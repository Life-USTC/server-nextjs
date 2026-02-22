import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SwaggerViewer } from "./swagger-viewer";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");

  return {
    title: t("pages.apiDocs"),
  };
}

export default async function ApiDocsPage() {
  return <SwaggerViewer />;
}
