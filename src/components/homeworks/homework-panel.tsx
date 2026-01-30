"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CommentMarkdown } from "@/components/comments/comment-markdown";
import type { CommentNode } from "@/components/comments/comment-types";
import { CommentsSection } from "@/components/comments/comments-section";
import { MarkdownEditor } from "@/components/comments/markdown-editor";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetPanel,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Link } from "@/i18n/routing";

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

type UserSummary = {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
};

type HomeworkEntry = {
  id: string;
  title: string;
  isMajor: boolean;
  requiresTeam: boolean;
  publishedAt: string | null;
  submissionStartAt: string | null;
  submissionDueAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  createdById: string | null;
  description: {
    id: string;
    content: string;
    updatedAt: string | null;
  } | null;
  createdBy: UserSummary | null;
  updatedBy: UserSummary | null;
  deletedBy: UserSummary | null;
};

type AuditLogEntry = {
  id: string;
  action: "created" | "deleted";
  titleSnapshot: string;
  createdAt: string;
  actor: UserSummary | null;
};

type HomeworkResponse = {
  homeworks: HomeworkEntry[];
  auditLogs: AuditLogEntry[];
  viewer: ViewerSummary;
};

type DescriptionHistoryEntry = {
  id: string;
  createdAt: string;
  previousContent: string | null;
  nextContent: string;
  editor: UserSummary | null;
};

type DescriptionHistoryResponse = {
  history: DescriptionHistoryEntry[];
};

type CommentsResponse = {
  comments: CommentNode[];
};

type HomeworkPanelProps = {
  sectionId: number;
  semesterStart?: string | null;
  semesterEnd?: string | null;
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

function toLocalInputValue(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function endOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(23, 59, 0, 0);
  return copy;
}

export function HomeworkPanel({
  sectionId,
  semesterStart,
  semesterEnd,
}: HomeworkPanelProps) {
  const t = useTranslations("homeworks");
  const tComments = useTranslations("comments");
  const tDescriptions = useTranslations("descriptions");
  const locale = useLocale();
  const { toast } = useToast();
  const [homeworks, setHomeworks] = useState<HomeworkEntry[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [viewer, setViewer] = useState<ViewerSummary>(EMPTY_VIEWER);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPublishedAt, setNewPublishedAt] = useState("");
  const [newSubmissionStartAt, setNewSubmissionStartAt] = useState("");
  const [newSubmissionDueAt, setNewSubmissionDueAt] = useState("");
  const [newIsMajor, setNewIsMajor] = useState(false);
  const [newRequiresTeam, setNewRequiresTeam] = useState(false);

  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPublishedAt, setEditPublishedAt] = useState("");
  const [editSubmissionStartAt, setEditSubmissionStartAt] = useState("");
  const [editSubmissionDueAt, setEditSubmissionDueAt] = useState("");
  const [editIsMajor, setEditIsMajor] = useState(false);
  const [editRequiresTeam, setEditRequiresTeam] = useState(false);

  const [descriptionHistory, setDescriptionHistory] = useState<
    Record<
      string,
      {
        loading: boolean;
        error: string | null;
        entries: DescriptionHistoryEntry[];
      }
    >
  >({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>(
    {},
  );

  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [locale],
  );

  const semesterEndDate = useMemo(
    () => (semesterEnd ? new Date(semesterEnd) : null),
    [semesterEnd],
  );
  const semesterStartDate = useMemo(
    () => (semesterStart ? new Date(semesterStart) : null),
    [semesterStart],
  );

  const canCreate = viewer.isAuthenticated && !viewer.isSuspended;
  const canEdit = viewer.isAuthenticated && !viewer.isSuspended;
  const resolveHomeworkError = useCallback(
    (error: string | null) => {
      if (!error) return t("errorGeneric");
      switch (error) {
        case "Title required":
          return t("errorTitleRequired");
        case "Title too long":
          return t("errorTitleTooLong");
        case "Description too long":
          return t("errorDescriptionTooLong");
        case "Invalid publish date":
          return t("errorInvalidPublishDate");
        case "Invalid submission start":
          return t("errorInvalidSubmissionStart");
        case "Invalid submission due":
          return t("errorInvalidSubmissionDue");
        case "Submission start must be before due":
          return t("errorSubmissionRange");
        case "Unauthorized":
          return t("errorUnauthorized");
        case "Suspended":
          return t("errorSuspended");
        case "Section not found":
          return t("errorSectionNotFound");
        case "Not found":
          return t("errorNotFound");
        case "Homework deleted":
          return t("errorHomeworkDeleted");
        case "No changes":
          return t("errorNoChanges");
        default:
          return t("errorGeneric");
      }
    },
    [t],
  );

  const getResponseErrorMessage = useCallback(
    async (response: Response) => {
      try {
        const data = (await response.json()) as { error?: unknown } | null;
        const error = typeof data?.error === "string" ? data.error : null;
        return resolveHomeworkError(error);
      } catch {
        return t("errorGeneric");
      }
    },
    [resolveHomeworkError, t],
  );

  const countCommentNodes = useCallback((nodes: CommentNode[]): number => {
    return nodes.reduce(
      (total, node) => total + 1 + countCommentNodes(node.replies ?? []),
      0,
    );
  }, []);

  const loadCommentCounts = useCallback(
    async (entries: HomeworkEntry[]) => {
      if (!entries.length) {
        setCommentCounts({});
        return;
      }
      try {
        const responses = await Promise.all(
          entries.map(async (homework) => {
            const params = new URLSearchParams({
              targetType: "homework",
              targetId: homework.id,
            });
            const response = await fetch(`/api/comments?${params.toString()}`);
            if (!response.ok) {
              throw new Error("Failed to load comments");
            }
            const data = (await response.json()) as CommentsResponse;
            return [
              homework.id,
              countCommentNodes(data.comments ?? []),
            ] as const;
          }),
        );
        setCommentCounts(Object.fromEntries(responses));
      } catch (err) {
        console.error("Failed to load comment counts", err);
      }
    },
    [countCommentNodes],
  );

  const loadHomeworks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/homeworks?sectionId=${sectionId}`);
      if (!response.ok) {
        throw new Error("Failed to load homeworks");
      }
      const data = (await response.json()) as HomeworkResponse;
      setHomeworks(data.homeworks ?? []);
      setAuditLogs(data.auditLogs ?? []);
      setViewer(data.viewer ?? EMPTY_VIEWER);
      void loadCommentCounts(data.homeworks ?? []);
    } catch (err) {
      console.error("Failed to load homeworks", err);
      setError(t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [loadCommentCounts, sectionId, t]);

  useEffect(() => {
    void loadHomeworks();
  }, [loadHomeworks]);

  const startEditing = (homework: HomeworkEntry) => {
    setEditingId(homework.id);
    setEditTitle(homework.title ?? "");
    setEditDescription(homework.description?.content ?? "");
    setEditPublishedAt(toLocalInputValue(homework.publishedAt));
    setEditSubmissionStartAt(toLocalInputValue(homework.submissionStartAt));
    setEditSubmissionDueAt(toLocalInputValue(homework.submissionDueAt));
    setEditIsMajor(Boolean(homework.isMajor));
    setEditRequiresTeam(Boolean(homework.requiresTeam));
  };

  const resetCreateForm = () => {
    setNewTitle("");
    setNewDescription("");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setNewPublishedAt(toLocalInputValue(today.toISOString()));
    setNewSubmissionStartAt(toLocalInputValue(new Date().toISOString()));
    setNewSubmissionDueAt("");
    setNewIsMajor(false);
    setNewRequiresTeam(false);
  };

  useEffect(() => {
    if (!showCreate) return;
    if (!newPublishedAt) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setNewPublishedAt(toLocalInputValue(today.toISOString()));
    }
    if (!newSubmissionStartAt) {
      setNewSubmissionStartAt(toLocalInputValue(new Date().toISOString()));
    }
  }, [newPublishedAt, newSubmissionStartAt, showCreate]);

  const applyDueInAWeek = (setter: (value: string) => void) => {
    const now = new Date();
    now.setDate(now.getDate() + 7);
    setter(toLocalInputValue(endOfDay(now).toISOString()));
  };

  const applySemesterEnd = (setter: (value: string) => void) => {
    if (!semesterEndDate || Number.isNaN(semesterEndDate.getTime())) return;
    setter(toLocalInputValue(endOfDay(semesterEndDate).toISOString()));
  };

  const applyStartNow = (setter: (value: string) => void) => {
    setter(toLocalInputValue(new Date().toISOString()));
  };

  const applySemesterStart = (setter: (value: string) => void) => {
    if (!semesterStartDate || Number.isNaN(semesterStartDate.getTime())) return;
    setter(toLocalInputValue(semesterStartDate.toISOString()));
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) {
      toast({
        title: t("titleRequired"),
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/homeworks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId,
          title: newTitle.trim(),
          description: newDescription.trim(),
          publishedAt: newPublishedAt || null,
          submissionStartAt: newSubmissionStartAt || null,
          submissionDueAt: newSubmissionDueAt || null,
          isMajor: newIsMajor,
          requiresTeam: newRequiresTeam,
        }),
      });

      if (!response.ok) {
        const message = await getResponseErrorMessage(response);
        toast({
          title: t("createFailed"),
          description: message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: t("createSuccess"),
        variant: "success",
      });
      resetCreateForm();
      setShowCreate(false);
      await loadHomeworks();
    } catch (err) {
      console.error("Failed to create homework", err);
      toast({
        title: t("createFailed"),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (homework: HomeworkEntry) => {
    if (!editTitle.trim()) {
      toast({
        title: t("titleRequired"),
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/homeworks/${homework.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          publishedAt: editPublishedAt || null,
          submissionStartAt: editSubmissionStartAt || null,
          submissionDueAt: editSubmissionDueAt || null,
          isMajor: editIsMajor,
          requiresTeam: editRequiresTeam,
        }),
      });

      if (!response.ok) {
        const message = await getResponseErrorMessage(response);
        toast({
          title: t("updateFailed"),
          description: message,
          variant: "destructive",
        });
        return;
      }

      const nextDescription = editDescription.trim();
      const currentDescription = homework.description?.content?.trim() ?? "";
      if (nextDescription !== currentDescription) {
        const descriptionResponse = await fetch("/api/descriptions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetType: "homework",
            targetId: homework.id,
            content: nextDescription,
          }),
        });

        if (!descriptionResponse.ok) {
          const message = await getResponseErrorMessage(descriptionResponse);
          toast({
            title: t("updateFailed"),
            description: message,
            variant: "destructive",
          });
          return;
        }
      }

      toast({
        title: t("updateSuccess"),
        variant: "success",
      });
      setEditingId(null);
      await loadHomeworks();
    } catch (err) {
      console.error("Failed to update homework", err);
      toast({
        title: t("updateFailed"),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (homework: HomeworkEntry) => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/homeworks/${homework.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const message = await getResponseErrorMessage(response);
        toast({
          title: t("deleteFailed"),
          description: message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: t("deleteSuccess"),
        variant: "success",
      });
      setEditingId(null);
      await loadHomeworks();
    } catch (err) {
      console.error("Failed to delete homework", err);
      toast({
        title: t("deleteFailed"),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const loadDescriptionHistory = useCallback(
    async (homeworkId: string) => {
      setDescriptionHistory((prev) => ({
        ...prev,
        [homeworkId]: {
          loading: true,
          error: null,
          entries: prev[homeworkId]?.entries ?? [],
        },
      }));

      try {
        const params = new URLSearchParams({
          targetType: "homework",
          targetId: homeworkId,
        });
        const response = await fetch(`/api/descriptions?${params.toString()}`);
        if (!response.ok) {
          throw new Error("Failed to load description history");
        }
        const data = (await response.json()) as DescriptionHistoryResponse;
        setDescriptionHistory((prev) => ({
          ...prev,
          [homeworkId]: {
            loading: false,
            error: null,
            entries: data.history ?? [],
          },
        }));
      } catch (err) {
        console.error("Failed to load description history", err);
        setDescriptionHistory((prev) => ({
          ...prev,
          [homeworkId]: {
            loading: false,
            error: t("loadFailed"),
            entries: prev[homeworkId]?.entries ?? [],
          },
        }));
      }
    },
    [t],
  );

  const renderTagBadges = (homework: HomeworkEntry) => (
    <div className="flex flex-wrap gap-2">
      {homework.isMajor && <Badge variant="secondary">{t("tagMajor")}</Badge>}
      {homework.requiresTeam && <Badge variant="outline">{t("tagTeam")}</Badge>}
      {!homework.isMajor && !homework.requiresTeam && (
        <Badge variant="outline">{t("tagDefault")}</Badge>
      )}
    </div>
  );

  const renderHelperActions = (
    type: "create" | "edit",
    target: "start" | "due",
  ) => {
    const setValue = (value: string) => {
      if (type === "create") {
        target === "start"
          ? setNewSubmissionStartAt(value)
          : setNewSubmissionDueAt(value);
        return;
      }
      target === "start"
        ? setEditSubmissionStartAt(value)
        : setEditSubmissionDueAt(value);
    };

    return (
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => applyStartNow(setValue)}
        >
          {t("helperNow")}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => applyDueInAWeek(setValue)}
        >
          {t("helperWeek")}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => applySemesterEnd(setValue)}
          disabled={!semesterEndDate}
        >
          {t("helperSemesterEnd")}
        </Button>
        {target === "start" && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => applySemesterStart(setValue)}
            disabled={!semesterStartDate}
          >
            {t("helperSemesterStart")}
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {canCreate ? (
          <Sheet open={showCreate} onOpenChange={setShowCreate}>
            <SheetTrigger render={<Button size="sm" variant="outline" />}>
              {t("showCreate")}
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>{t("createTitle")}</SheetTitle>
              </SheetHeader>
              <SheetPanel className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="homework-title">{t("titleLabel")}</Label>
                  <Input
                    id="homework-title"
                    value={newTitle}
                    onChange={(event) => setNewTitle(event.target.value)}
                    placeholder={t("titlePlaceholder")}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t("descriptionLabel")}</Label>
                  <MarkdownEditor
                    value={newDescription}
                    onChange={setNewDescription}
                    placeholder={t("descriptionPlaceholder")}
                    tabWriteLabel={tComments("tabWrite")}
                    tabPreviewLabel={tComments("tabPreview")}
                    previewEmptyLabel={tComments("previewEmpty")}
                    markdownGuideLabel={tComments("markdownGuide")}
                    markdownGuideHref="/comments/guide"
                  />
                </div>

                <Separator />

                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="homework-major"
                      checked={newIsMajor}
                      onCheckedChange={setNewIsMajor}
                    />
                    <Label htmlFor="homework-major">{t("tagMajor")}</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="homework-team"
                      checked={newRequiresTeam}
                      onCheckedChange={setNewRequiresTeam}
                    />
                    <Label htmlFor="homework-team">{t("tagTeam")}</Label>
                  </div>
                </div>

                <Separator />

                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="homework-published">
                      {t("publishedAt")}
                    </Label>
                    <Input
                      id="homework-published"
                      type="datetime-local"
                      value={newPublishedAt}
                      onChange={(event) =>
                        setNewPublishedAt(event.target.value)
                      }
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setNewPublishedAt(
                            toLocalInputValue(new Date().toISOString()),
                          )
                        }
                      >
                        {t("helperPublishNow")}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setNewPublishedAt("")}
                      >
                        {t("helperClear")}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="homework-start">
                      {t("submissionStart")}
                    </Label>
                    <Input
                      id="homework-start"
                      type="datetime-local"
                      value={newSubmissionStartAt}
                      onChange={(event) =>
                        setNewSubmissionStartAt(event.target.value)
                      }
                    />
                    {renderHelperActions("create", "start")}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="homework-due">{t("submissionDue")}</Label>
                    <Input
                      id="homework-due"
                      type="datetime-local"
                      value={newSubmissionDueAt}
                      onChange={(event) =>
                        setNewSubmissionDueAt(event.target.value)
                      }
                    />
                    {renderHelperActions("create", "due")}
                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      resetCreateForm();
                      setShowCreate(false);
                    }}
                  >
                    {t("cancel")}
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={isSaving || !canCreate}
                  >
                    {isSaving ? t("saving") : t("createAction")}
                  </Button>
                </div>
              </SheetPanel>
            </SheetContent>
          </Sheet>
        ) : (
          <Button size="sm" variant="outline" render={<Link href="/signin" />}>
            {t("loginToCreate")}
          </Button>
        )}
        <Sheet>
          <SheetTrigger render={<Button size="sm" variant="outline" />}>
            {t("auditTitle")}
          </SheetTrigger>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>{t("auditTitle")}</SheetTitle>
            </SheetHeader>
            <SheetPanel>
              {auditLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("auditEmpty")}
                </p>
              ) : (
                <div className="space-y-3">
                  {auditLogs.map((log) => {
                    const actorName =
                      log.actor?.name ||
                      log.actor?.username ||
                      t("unknownActor");
                    return (
                      <div
                        key={log.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2"
                      >
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <Badge
                            variant={
                              log.action === "deleted"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {log.action === "deleted"
                              ? t("auditDeleted")
                              : t("auditCreated")}
                          </Badge>
                          <span className="font-medium text-foreground">
                            {log.titleSnapshot}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t("auditMeta", {
                            name: actorName,
                            date: formatter.format(new Date(log.createdAt)),
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </SheetPanel>
          </SheetContent>
        </Sheet>
      </div>

      {viewer.isSuspended && (
        <Card className="border-dashed bg-muted/40">
          <CardPanel className="space-y-2">
            <p className="text-sm text-muted-foreground">{t("suspended")}</p>
            {viewer.suspensionReason && (
              <p className="text-xs text-muted-foreground">
                {t("suspendedReason", { reason: viewer.suspensionReason })}
              </p>
            )}
          </CardPanel>
        </Card>
      )}

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : error ? (
        <Card className="border-dashed">
          <CardPanel className="space-y-2">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={() => void loadHomeworks()}>
              {t("retry")}
            </Button>
          </CardPanel>
        </Card>
      ) : homeworks.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{t("emptyTitle")}</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-4">
          {homeworks.map((homework) => {
            const isEditing = editingId === homework.id;
            const canDelete =
              viewer.isAuthenticated &&
              !viewer.isSuspended &&
              (viewer.isAdmin || homework.createdById === viewer.userId);
            return (
              <Card key={homework.id} className="group border-border/60">
                <CardHeader className="gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <CardTitle className="text-base">
                        {homework.title}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {t("createdAt", {
                          date: formatter.format(new Date(homework.createdAt)),
                        })}
                      </p>
                    </div>
                    <CardAction className="flex flex-wrap gap-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                      <Sheet>
                        <SheetTrigger
                          render={<Button size="sm" variant="outline" />}
                        >
                          {t("commentsAction")} (
                          {commentCounts[homework.id] ?? 0})
                        </SheetTrigger>
                        <SheetContent side="right">
                          <SheetHeader>
                            <SheetTitle>{t("commentsTitle")}</SheetTitle>
                          </SheetHeader>
                          <SheetPanel>
                            <CommentsSection
                              targets={[
                                {
                                  key: "homework",
                                  label: t("commentsLabel"),
                                  type: "homework",
                                  homeworkId: homework.id,
                                },
                              ]}
                            />
                          </SheetPanel>
                        </SheetContent>
                      </Sheet>
                      {canEdit && !isEditing && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEditing(homework)}
                        >
                          {t("editAction")}
                        </Button>
                      )}
                    </CardAction>
                  </div>
                </CardHeader>
                <CardPanel className="space-y-4">
                  {!isEditing && (
                    <>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">
                            {t("submissionDue")}
                          </p>
                          <p className="text-xl font-semibold text-foreground">
                            {homework.submissionDueAt
                              ? formatter.format(
                                  new Date(homework.submissionDueAt),
                                )
                              : t("dateTBD")}
                          </p>
                        </div>
                      </div>
                      <div className="rounded-lg border border-border/60 bg-muted/5 px-3 py-3">
                        {homework.description?.content ? (
                          <CommentMarkdown
                            content={homework.description.content}
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            {t("descriptionEmpty")}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <p>
                            {t("submissionStart")} ·{" "}
                            {homework.submissionStartAt
                              ? formatter.format(
                                  new Date(homework.submissionStartAt),
                                )
                              : t("dateTBD")}
                          </p>
                          <p>
                            {t("publishedAt")} ·{" "}
                            {homework.publishedAt
                              ? formatter.format(new Date(homework.publishedAt))
                              : t("dateTBD")}
                          </p>
                        </div>
                        {renderTagBadges(homework)}
                      </div>
                    </>
                  )}

                  {isEditing && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor={`homework-edit-title-${homework.id}`}>
                          {t("titleLabel")}
                        </Label>
                        <Input
                          id={`homework-edit-title-${homework.id}`}
                          value={editTitle}
                          onChange={(event) => setEditTitle(event.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>{t("descriptionLabel")}</Label>
                        <MarkdownEditor
                          value={editDescription}
                          onChange={setEditDescription}
                          placeholder={t("descriptionPlaceholder")}
                          tabWriteLabel={tComments("tabWrite")}
                          tabPreviewLabel={tComments("tabPreview")}
                          previewEmptyLabel={tComments("previewEmpty")}
                          markdownGuideLabel={tComments("markdownGuide")}
                          markdownGuideHref="/comments/guide"
                        />
                      </div>

                      <Separator />

                      <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            id={`homework-edit-major-${homework.id}`}
                            checked={editIsMajor}
                            onCheckedChange={setEditIsMajor}
                          />
                          <Label htmlFor={`homework-edit-major-${homework.id}`}>
                            {t("tagMajor")}
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            id={`homework-edit-team-${homework.id}`}
                            checked={editRequiresTeam}
                            onCheckedChange={setEditRequiresTeam}
                          />
                          <Label htmlFor={`homework-edit-team-${homework.id}`}>
                            {t("tagTeam")}
                          </Label>
                        </div>
                      </div>

                      <Separator />

                      <div className="grid gap-4 lg:grid-cols-3">
                        <div className="space-y-2">
                          <Label
                            htmlFor={`homework-edit-publish-${homework.id}`}
                          >
                            {t("publishedAt")}
                          </Label>
                          <Input
                            id={`homework-edit-publish-${homework.id}`}
                            type="datetime-local"
                            value={editPublishedAt}
                            onChange={(event) =>
                              setEditPublishedAt(event.target.value)
                            }
                          />
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setEditPublishedAt(
                                  toLocalInputValue(new Date().toISOString()),
                                )
                              }
                            >
                              {t("helperPublishNow")}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditPublishedAt("")}
                            >
                              {t("helperClear")}
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`homework-edit-start-${homework.id}`}>
                            {t("submissionStart")}
                          </Label>
                          <Input
                            id={`homework-edit-start-${homework.id}`}
                            type="datetime-local"
                            value={editSubmissionStartAt}
                            onChange={(event) =>
                              setEditSubmissionStartAt(event.target.value)
                            }
                          />
                          {renderHelperActions("edit", "start")}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`homework-edit-due-${homework.id}`}>
                            {t("submissionDue")}
                          </Label>
                          <Input
                            id={`homework-edit-due-${homework.id}`}
                            type="datetime-local"
                            value={editSubmissionDueAt}
                            onChange={(event) =>
                              setEditSubmissionDueAt(event.target.value)
                            }
                          />
                          {renderHelperActions("edit", "due")}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap gap-2">
                          <Sheet
                            onOpenChange={(open) => {
                              if (open) {
                                void loadDescriptionHistory(homework.id);
                              }
                            }}
                          >
                            <SheetTrigger
                              render={<Button size="sm" variant="outline" />}
                            >
                              {t("contentHistoryAction")}
                            </SheetTrigger>
                            <SheetContent side="right">
                              <SheetHeader>
                                <SheetTitle>
                                  {tDescriptions("historyTitle", {
                                    count:
                                      descriptionHistory[homework.id]?.entries
                                        ?.length ?? 0,
                                  })}
                                </SheetTitle>
                              </SheetHeader>
                              <SheetPanel className="space-y-4">
                                {descriptionHistory[homework.id]?.loading ? (
                                  <div className="space-y-3">
                                    <Skeleton className="h-20 w-full" />
                                    <Skeleton className="h-20 w-full" />
                                  </div>
                                ) : descriptionHistory[homework.id]?.error ? (
                                  <p className="text-sm text-muted-foreground">
                                    {descriptionHistory[homework.id]?.error}
                                  </p>
                                ) : descriptionHistory[homework.id]?.entries
                                    ?.length ? (
                                  descriptionHistory[homework.id].entries.map(
                                    (entry) => {
                                      const editorName =
                                        entry.editor?.name ||
                                        entry.editor?.username ||
                                        tDescriptions("editorUnknown");
                                      return (
                                        <div
                                          key={entry.id}
                                          className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-3"
                                        >
                                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                                            <span>{editorName}</span>
                                            <span>
                                              {formatter.format(
                                                new Date(entry.createdAt),
                                              )}
                                            </span>
                                          </div>
                                          <div className="space-y-2 text-sm">
                                            <p className="text-xs text-muted-foreground">
                                              {tDescriptions("previousLabel")}
                                            </p>
                                            <div className="rounded-md border border-border/60 bg-background px-3 py-2">
                                              {entry.previousContent ? (
                                                <CommentMarkdown
                                                  content={
                                                    entry.previousContent
                                                  }
                                                />
                                              ) : (
                                                <p className="text-sm text-muted-foreground">
                                                  {tDescriptions("emptyValue")}
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                          <div className="space-y-2 text-sm">
                                            <p className="text-xs text-muted-foreground">
                                              {tDescriptions("updatedLabel")}
                                            </p>
                                            <div className="rounded-md border border-border/60 bg-background px-3 py-2">
                                              {entry.nextContent ? (
                                                <CommentMarkdown
                                                  content={entry.nextContent}
                                                />
                                              ) : (
                                                <p className="text-sm text-muted-foreground">
                                                  {tDescriptions("emptyValue")}
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    },
                                  )
                                ) : (
                                  <p className="text-sm text-muted-foreground">
                                    {tDescriptions("historyEmpty")}
                                  </p>
                                )}
                              </SheetPanel>
                            </SheetContent>
                          </Sheet>
                          {canDelete && (
                            <AlertDialog>
                              <AlertDialogTrigger
                                render={<Button size="sm" variant="ghost" />}
                              >
                                {t("deleteAction")}
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    {t("deleteTitle")}
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t("deleteDescription", {
                                      title: homework.title,
                                    })}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogClose
                                    render={<Button variant="ghost" />}
                                  >
                                    {t("cancel")}
                                  </AlertDialogClose>
                                  <Button
                                    variant="destructive"
                                    onClick={() => void handleDelete(homework)}
                                    disabled={isSaving}
                                  >
                                    {t("confirmDelete")}
                                  </Button>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="ghost"
                            onClick={() => setEditingId(null)}
                          >
                            {t("cancel")}
                          </Button>
                          <Button
                            onClick={() => void handleUpdate(homework)}
                            disabled={isSaving}
                          >
                            {isSaving ? t("saving") : t("saveChanges")}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardPanel>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
