"use client";

import { type Change, diffWords } from "diff";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CommentMarkdown } from "@/components/comments/comment-markdown";
import { MarkdownEditor } from "@/components/comments/markdown-editor";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetPanel,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Link } from "@/i18n/routing";

type TargetType = "section" | "course" | "teacher" | "homework";

type EditorSummary = {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
};

type ViewerSummary = {
  userId: string | null;
  name: string | null;
  image: string | null;
  isAdmin: boolean;
  isAuthenticated: boolean;
  isSuspended: boolean;
  suspensionReason: string | null;
  suspensionExpiresAt: string | null;
};

type DescriptionData = {
  id: string | null;
  content: string;
  updatedAt: string | null;
  lastEditedAt: string | null;
  lastEditedBy: EditorSummary | null;
};

type HistoryItem = {
  id: string;
  createdAt: string;
  previousContent: string | null;
  nextContent: string;
  editor: EditorSummary | null;
};

type DiffMode = "previous" | "next";

type DescriptionResponse = {
  description: DescriptionData;
  history: HistoryItem[];
  viewer: ViewerSummary;
};

type DescriptionPanelProps = {
  targetType: TargetType;
  targetId: number | string;
  initialData?: DescriptionResponse;
};

const EMPTY_DESCRIPTION: DescriptionData = {
  id: null,
  content: "",
  updatedAt: null,
  lastEditedAt: null,
  lastEditedBy: null,
};

const EMPTY_VIEWER: ViewerSummary = {
  userId: null,
  name: null,
  image: null,
  isAdmin: false,
  isAuthenticated: false,
  isSuspended: false,
  suspensionReason: null,
  suspensionExpiresAt: null,
};

function renderDiff(previous: string | null, next: string, mode: DiffMode) {
  const baseText = previous ?? "";
  const segments = diffWords(baseText, next) as Change[];
  const visibleSegments = segments.filter((segment: Change) => {
    if (mode === "previous") return !segment.added;
    return !segment.removed;
  });

  if (visibleSegments.length === 0) {
    return null;
  }

  return (
    <span className="whitespace-pre-wrap">
      {visibleSegments.map((segment: Change, index: number) => {
        const isAdded = Boolean(segment.added);
        const isRemoved = Boolean(segment.removed);
        const highlightClass = isAdded
          ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-400/20 dark:text-emerald-100"
          : isRemoved
            ? "bg-rose-100 text-rose-900 dark:bg-rose-400/20 dark:text-rose-100"
            : null;

        return (
          <span
            key={`${segment.value}-${index}`}
            className={highlightClass ?? undefined}
          >
            {segment.value}
          </span>
        );
      })}
    </span>
  );
}

export function DescriptionPanel({
  targetType,
  targetId,
  initialData,
}: DescriptionPanelProps) {
  const t = useTranslations("descriptions");
  const locale = useLocale();
  const { toast } = useToast();
  const [description, setDescription] = useState<DescriptionData>(
    initialData?.description ?? EMPTY_DESCRIPTION,
  );
  const [history, setHistory] = useState<HistoryItem[]>(
    initialData?.history ?? [],
  );
  const [viewer, setViewer] = useState<ViewerSummary>(
    initialData?.viewer ?? EMPTY_VIEWER,
  );
  const [loading, setLoading] = useState(!initialData);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [locale],
  );

  const loadDescription = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("targetType", targetType);
      params.set("targetId", String(targetId));
      const response = await fetch(`/api/descriptions?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to load description");
      }
      const data = (await response.json()) as DescriptionResponse;
      setDescription(data.description ?? EMPTY_DESCRIPTION);
      setHistory(data.history ?? []);
      setViewer(data.viewer ?? EMPTY_VIEWER);
    } catch (err) {
      console.error("Failed to load description", err);
      setError(t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t, targetId, targetType]);

  useEffect(() => {
    if (initialData) return;
    void loadDescription();
  }, [initialData, loadDescription]);

  const handleEdit = () => {
    setDraft(description.content);
    setEditing(true);
  };

  const handleCancel = () => {
    setDraft("");
    setEditing(false);
  };

  const handleSave = async () => {
    const content = draft.trim();
    setSaving(true);
    try {
      const response = await fetch("/api/descriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType,
          targetId,
          content,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update description");
      }

      toast({
        title: t("updateSuccess"),
        variant: "success",
      });
      setEditing(false);
      setDraft("");
      await loadDescription();
    } catch (err) {
      console.error("Failed to update description", err);
      toast({
        title: t("updateError"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const canEdit = viewer.isAuthenticated && !viewer.isSuspended;
  const lastEditedAt = description.lastEditedAt
    ? dateFormatter.format(new Date(description.lastEditedAt))
    : null;
  const lastEditorName =
    description.lastEditedBy?.name ||
    description.lastEditedBy?.username ||
    t("editorUnknown");

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardAction>
          {viewer.isAuthenticated ? (
            canEdit && !editing ? (
              <Button size="sm" variant="outline" onClick={handleEdit}>
                {t("edit")}
              </Button>
            ) : null
          ) : (
            <Button
              size="sm"
              variant="outline"
              render={<Link className="no-underline" href="/signin" />}
            >
              {t("loginToEdit")}
            </Button>
          )}
        </CardAction>
      </CardHeader>
      <CardPanel className="space-y-5">
        {viewer.isSuspended && (
          <Alert variant="error">
            <AlertTitle>{t("suspendedTitle")}</AlertTitle>
            <AlertDescription className="space-y-1">
              <p>{t("suspendedMessage")}</p>
              {viewer.suspensionReason && (
                <p className="text-sm">
                  {t("suspendedReason", { reason: viewer.suspensionReason })}
                </p>
              )}
              {viewer.suspensionExpiresAt ? (
                <p className="text-sm">
                  {t("suspendedExpires", {
                    date: dateFormatter.format(
                      new Date(viewer.suspensionExpiresAt),
                    ),
                  })}
                </p>
              ) : (
                <p className="text-sm font-semibold">
                  {t("suspendedPermanent")}
                </p>
              )}
            </AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : error ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadDescription()}
            >
              {t("retry")}
            </Button>
          </div>
        ) : editing ? (
          <div className="space-y-3">
            <MarkdownEditor
              value={draft}
              onChange={setDraft}
              placeholder={t("editorPlaceholder")}
              tabWriteLabel={t("tabWrite")}
              tabPreviewLabel={t("tabPreview")}
              previewEmptyLabel={t("previewEmpty")}
              markdownGuideLabel={t("markdownGuide")}
              markdownGuideHref="/comments/guide"
              disabled={!canEdit}
            />
            <div className="flex flex-wrap gap-2 justify-end">
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? t("saving") : t("save")}
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel}>
                {t("cancel")}
              </Button>
            </div>
          </div>
        ) : description.content ? (
          <div className="space-y-2">
            <CommentMarkdown content={description.content} />
            {lastEditedAt && (
              <p className="text-xs text-muted-foreground">
                {t("lastEdited", { date: lastEditedAt })} ·{" "}
                {t("editedBy", { name: lastEditorName })}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          </div>
        )}

        <Sheet>
          <SheetTrigger
            render={
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-sm text-muted-foreground"
              />
            }
          >
            {t("historyTitle", { count: history.length })}
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>
                {t("historyTitle", { count: history.length })}
              </SheetTitle>
            </SheetHeader>
            <SheetPanel>
              {history.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyTitle>{t("historyEmpty")}</EmptyTitle>
                  </EmptyHeader>
                </Empty>
              ) : (
                <div className="space-y-4">
                  {history.map((item) => {
                    const editorName =
                      item.editor?.name ||
                      item.editor?.username ||
                      t("editorUnknown");
                    const previousDiff = renderDiff(
                      item.previousContent,
                      item.nextContent,
                      "previous",
                    );
                    const nextDiff = renderDiff(
                      item.previousContent,
                      item.nextContent,
                      "next",
                    );
                    return (
                      <div
                        key={item.id}
                        className="rounded-xl border border-border/60 bg-muted/40 p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">
                            {editorName}
                          </span>
                          <span>·</span>
                          <span>
                            {dateFormatter.format(new Date(item.createdAt))}
                          </span>
                        </div>
                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">
                              {t("previousLabel")}
                            </p>
                            <div className="max-h-40 overflow-y-auto rounded-lg border border-border/60 bg-background p-2 text-xs whitespace-pre-wrap">
                              {previousDiff ?? t("emptyValue")}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">
                              {t("updatedLabel")}
                            </p>
                            <div className="max-h-40 overflow-y-auto rounded-lg border border-border/60 bg-background p-2 text-xs whitespace-pre-wrap">
                              {nextDiff ?? t("emptyValue")}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </SheetPanel>
          </SheetContent>
        </Sheet>
      </CardPanel>
    </Card>
  );
}
