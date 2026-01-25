import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Card, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("commentsGuide");
  return {
    title: t("title"),
  };
}

export default async function CommentsGuidePage() {
  const t = await getTranslations("commentsGuide");

  return (
    <main className="page-main">
      <div className="mb-8 mt-8">
        <h1 className="text-display mb-2">{t("title")}</h1>
        <p className="text-subtitle text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("markdownTitle")}</CardTitle>
          </CardHeader>
          <CardPanel className="space-y-3 text-sm">
            <p>{t("markdownDescription")}</p>
            <pre className="rounded-lg bg-muted p-3 text-xs">
              {`**bold**  *italic*  ~~strike~~

- list item
1. ordered item

> blockquote

\`code\`

\`\`\`
code block
\`\`\``}
            </pre>
          </CardPanel>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("mathTitle")}</CardTitle>
          </CardHeader>
          <CardPanel className="space-y-3 text-sm">
            <p>{t("mathDescription")}</p>
            <pre className="rounded-lg bg-muted p-3 text-xs">
              {`Inline: $E = mc^2$

Block:
$$
int_0^infty e^{-x} dx = 1
$$`}
            </pre>
          </CardPanel>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("mdxTitle")}</CardTitle>
          </CardHeader>
          <CardPanel className="space-y-3 text-sm">
            <p>{t("mdxDescription")}</p>
            <pre className="rounded-lg bg-muted p-3 text-xs">
              {`<Image src="/path/to.png" width={320} align="center" />

<Center>
  **Centered text**
</Center>`}
            </pre>
          </CardPanel>
        </Card>
      </div>
    </main>
  );
}
