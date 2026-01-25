import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CommentThreadPage } from "@/components/comments/comment-thread-page";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const t = await getTranslations("comments");
  const { id } = await params;

  return {
    title: t("threadMetadata", { id }),
  };
}

export default async function CommentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("comments");

  return (
    <main className="page-main">
      <div className="mb-8 mt-8">
        <h1 className="text-display mb-2">{t("threadTitle")}</h1>
        <p className="text-subtitle text-muted-foreground">
          {t("threadDescription")}
        </p>
      </div>
      <CommentThreadPage commentId={id} />
    </main>
  );
}
