"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type {
  CommentReaction,
  CommentViewer,
} from "@/components/comments/comment-types";
import { Button } from "@/components/ui/button";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "@/components/ui/menu";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const REACTION_OPTIONS = [
  { type: "upvote", emoji: "👍", labelKey: "upvote" },
  { type: "downvote", emoji: "👎", labelKey: "downvote" },
  { type: "heart", emoji: "❤️", labelKey: "heart" },
  { type: "laugh", emoji: "😄", labelKey: "laugh" },
  { type: "hooray", emoji: "🎉", labelKey: "hooray" },
  { type: "confused", emoji: "😕", labelKey: "confused" },
  { type: "rocket", emoji: "🚀", labelKey: "rocket" },
  { type: "eyes", emoji: "👀", labelKey: "eyes" },
] as const;

type CommentReactionsProps = {
  commentId: string;
  reactions: CommentReaction[];
  viewer: CommentViewer;
};

export function CommentReactions({
  commentId,
  reactions,
  viewer,
}: CommentReactionsProps) {
  const t = useTranslations("comments");
  const { toast } = useToast();
  const [items, setItems] = useState<CommentReaction[]>(reactions);
  const [pendingType, setPendingType] = useState<string | null>(null);

  useEffect(() => {
    setItems(reactions);
  }, [reactions]);

  const toggleReaction = async (type: string) => {
    if (!viewer.isAuthenticated) {
      toast({
        title: t("loginRequired"),
        description: t("loginRequiredDescription"),
        variant: "warning",
      });
      return;
    }

    if (pendingType) return;
    setPendingType(type);

    const existing = items.find((reaction) => reaction.type === type);
    const shouldRemove = existing?.viewerHasReacted ?? false;

    try {
      const response = await fetch(`/api/comments/${commentId}/reactions`, {
        method: shouldRemove ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });

      if (!response.ok) {
        throw new Error("Reaction failed");
      }

      setItems((current) => {
        const next = current.map((item) => ({ ...item }));
        const target = next.find((item) => item.type === type);
        if (target) {
          target.count = Math.max(0, target.count + (shouldRemove ? -1 : 1));
          target.viewerHasReacted = !shouldRemove;
          return next;
        }
        return [...next, { type, count: 1, viewerHasReacted: true }];
      });
    } catch (error) {
      console.error("Reaction failed", error);
      toast({
        title: t("reactionFailed"),
        description: t("pleaseRetry"),
        variant: "destructive",
      });
    } finally {
      setPendingType(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {REACTION_OPTIONS.map((option) => {
        const entry = items.find((reaction) => reaction.type === option.type);
        const count = entry?.count ?? 0;
        const active = entry?.viewerHasReacted ?? false;
        if (count === 0 && !active) return null;
        return (
          <Button
            key={option.type}
            variant="outline"
            size="xs"
            onClick={() => toggleReaction(option.type)}
            disabled={pendingType === option.type}
            className={cn(
              "bg-background text-foreground",
              active && "bg-accent/70",
            )}
          >
            <span className="text-base leading-none">{option.emoji}</span>
            <span className="text-xs">{count}</span>
            <span className="sr-only">{t(`reaction.${option.labelKey}`)}</span>
          </Button>
        );
      })}
      <Menu>
        <MenuTrigger
          render={
            <Button variant="ghost" size="xs">
              {t("reactionMenu")}
            </Button>
          }
        />
        <MenuPopup align="start">
          {REACTION_OPTIONS.map((option) => {
            const entry = items.find(
              (reaction) => reaction.type === option.type,
            );
            const count = entry?.count ?? 0;
            const active = entry?.viewerHasReacted ?? false;
            return (
              <MenuItem
                key={option.type}
                onClick={() => toggleReaction(option.type)}
                data-active={active}
                className={active ? "font-semibold" : undefined}
                disabled={pendingType === option.type}
              >
                <span className="text-base leading-none">{option.emoji}</span>
                <span>{t(`reaction.${option.labelKey}`)}</span>
                {count > 0 && (
                  <span className="ms-auto text-muted-foreground text-xs">
                    {count}
                  </span>
                )}
              </MenuItem>
            );
          })}
        </MenuPopup>
      </Menu>
    </div>
  );
}
