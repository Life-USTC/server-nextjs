"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { Card, CardPanel } from "@/components/ui/card";
import { Link } from "@/i18n/routing";

type LinkCard = {
  href: string;
  label: string;
  description?: string | null;
};

const urlPattern = /\bhttps?:\/\/[^\s<>()]+/gi;
const mentionPattern = /\b(section|teacher)#(\d+)\b/gi;

function extractLinkCards(
  content: string,
  t: ReturnType<typeof useTranslations>,
) {
  const cards: LinkCard[] = [];
  const seen = new Set<string>();

  for (const match of content.matchAll(mentionPattern)) {
    const kind = match[1];
    const id = match[2];
    const href = kind === "teacher" ? `/teachers/${id}` : `/sections/${id}`;
    if (seen.has(href)) continue;
    seen.add(href);
    cards.push({
      href,
      label:
        kind === "teacher"
          ? t("linkTeacher", { id })
          : t("linkSection", { id }),
      description: t("linkHost"),
    });
  }

  for (const match of content.matchAll(urlPattern)) {
    const href = match[0];
    if (seen.has(href)) continue;
    try {
      const url = new URL(href);
      if (url.hostname !== "life.ustc.tiankaima.dev") continue;
      seen.add(href);
      cards.push({
        href,
        label: url.pathname || href,
        description: url.hostname,
      });
    } catch {}
  }

  return cards;
}

type CommentLinkCardsProps = {
  content: string;
};

export function CommentLinkCards({ content }: CommentLinkCardsProps) {
  const t = useTranslations("comments");
  const cards = useMemo(() => extractLinkCards(content, t), [content, t]);
  if (cards.length === 0) return null;

  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      {cards.map((card) => (
        <Card key={card.href} className="gap-2 py-4">
          <CardPanel className="space-y-1">
            <Link href={card.href} className="text-sm font-medium">
              {card.label}
            </Link>
            {card.description && (
              <p className="text-xs text-muted-foreground">
                {card.description}
              </p>
            )}
          </CardPanel>
        </Card>
      ))}
    </div>
  );
}
