import type { ReactNode } from "react";
import { CommentMarkdown } from "@/components/comments/comment-markdown";
import {
  Card,
  CardAction,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type HomeworkItemCardProps = {
  cardClassName?: string;
  title: string;
  createdAtLabel: string;
  secondaryLabel?: string;
  headerActions?: ReactNode;
  submissionDueLabel: string;
  submissionDueValue: string;
  description: string | null;
  descriptionEmptyLabel: string;
  startAtLabel: string;
  startAtValue: string;
  publishedAtLabel: string;
  publishedAtValue: string;
  footerStart?: ReactNode;
  footerEnd?: ReactNode;
};

export function HomeworkItemCard({
  cardClassName,
  title,
  createdAtLabel,
  secondaryLabel,
  headerActions,
  submissionDueLabel,
  submissionDueValue,
  description,
  descriptionEmptyLabel,
  startAtLabel,
  startAtValue,
  publishedAtLabel,
  publishedAtValue,
  footerStart,
  footerEnd,
}: HomeworkItemCardProps) {
  return (
    <Card className={cn("border-border/60", cardClassName)}>
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">{title}</CardTitle>
            <p className="text-muted-foreground text-xs">{createdAtLabel}</p>
            {secondaryLabel ? (
              <p className="text-muted-foreground text-xs">{secondaryLabel}</p>
            ) : null}
          </div>
          {headerActions ? <CardAction>{headerActions}</CardAction> : null}
        </div>
      </CardHeader>
      <CardPanel className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs">
              {submissionDueLabel}
            </p>
            <p className="font-semibold text-foreground text-xl">
              {submissionDueValue}
            </p>
          </div>
        </div>
        <div className="rounded-lg border border-border/60 bg-muted/5 px-3 py-3">
          {description ? (
            <CommentMarkdown content={description} />
          ) : (
            <p className="text-muted-foreground text-sm">
              {descriptionEmptyLabel}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-muted-foreground text-xs">
          <div className="space-y-1 text-muted-foreground text-xs">
            <p>
              {startAtLabel} · {startAtValue}
            </p>
            <p>
              {publishedAtLabel} · {publishedAtValue}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {footerStart}
            {footerEnd}
          </div>
        </div>
      </CardPanel>
    </Card>
  );
}
