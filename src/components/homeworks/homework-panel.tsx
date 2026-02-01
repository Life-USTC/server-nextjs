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
import { cn } from "@/lib/utils";

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
  completion: {
    completedAt: string;
  } | null;
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
  initialData?: HomeworkResponse;
};

type CreateHomeworkSheetProps = {
  open: boolean;
  canCreate: boolean;
  isSaving: boolean;
  newTitle: string;
  newDescription: string;
  newPublishedAt: string;
  newSubmissionStartAt: string;
  newSubmissionDueAt: string;
  newIsMajor: boolean;
  newRequiresTeam: boolean;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onPublishedChange: (value: string) => void;
  onSubmissionStartChange: (value: string) => void;
  onSubmissionDueChange: (value: string) => void;
  onToggleMajor: (value: boolean) => void;
  onToggleRequiresTeam: (value: boolean) => void;
  onOpenChange: (open: boolean) => void;
  onReset: () => void;
  onCreate: () => void;
  onApplyStartNow: (setter: (value: string) => void) => void;
  onApplyWeek: (setter: (value: string) => void) => void;
  onApplySemesterEnd: (setter: (value: string) => void) => void;
  onApplySemesterStart: (setter: (value: string) => void) => void;
  labels: {
    titleLabel: string;
    titlePlaceholder: string;
    descriptionLabel: string;
    descriptionPlaceholder: string;
    tabWrite: string;
    tabPreview: string;
    previewEmpty: string;
    markdownGuide: string;
    helperNow: string;
    helperWeek: string;
    helperSemesterEnd: string;
    helperSemesterStart: string;
    publishedAt: string;
    helperPublishNow: string;
    helperClear: string;
    submissionStart: string;
    submissionDue: string;
    tagMajor: string;
    tagTeam: string;
    cancel: string;
    createAction: string;
    showCreate: string;
    createTitle: string;
    saving: string;
  };
};

type AuditLogSheetProps = {
  auditLogs: AuditLogEntry[];
  formatter: Intl.DateTimeFormat;
  labels: {
    title: string;
    empty: string;
    created: string;
    deleted: string;
    meta: (params: { name: string; date: string }) => string;
    trigger: string;
  };
};

type HomeworkCardHeaderProps = {
  homework: HomeworkEntry;
  formatter: Intl.DateTimeFormat;
  commentCount: number;
  canEdit: boolean;
  isEditing: boolean;
  onEdit: () => void;
  t: ReturnType<typeof useTranslations>;
};

type HomeworkCardReadOnlyProps = {
  homework: HomeworkEntry;
  formatter: Intl.DateTimeFormat;
  tagBadges: React.ReactNode;
  isAuthenticated: boolean;
  isSavingCompletion: boolean;
  onToggleCompletion: (nextCompleted: boolean) => void;
  t: ReturnType<typeof useTranslations>;
};

type HomeworkCardEditFormProps = {
  homework: HomeworkEntry;
  formatter: Intl.DateTimeFormat;
  editTitle: string;
  editDescription: string;
  editIsMajor: boolean;
  editRequiresTeam: boolean;
  editPublishedAt: string;
  editSubmissionStartAt: string;
  editSubmissionDueAt: string;
  canDelete: boolean;
  isSaving: boolean;
  descriptionHistory: {
    loading: boolean;
    error: string | null;
    entries: any[];
  };
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onToggleMajor: (value: boolean) => void;
  onToggleTeam: (value: boolean) => void;
  onPublishedChange: (value: string) => void;
  onSubmissionStartChange: (value: string) => void;
  onSubmissionDueChange: (value: string) => void;
  onLoadHistory: () => void;
  onCancel: () => void;
  onSave: () => void;
  onDelete: () => void;
  renderEditHelperActions: (target: "start" | "due") => React.ReactNode;
  t: ReturnType<typeof useTranslations>;
  tComments: ReturnType<typeof useTranslations>;
  tDescriptions: ReturnType<typeof useTranslations>;
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
  initialData,
}: HomeworkPanelProps) {
  const t = useTranslations("homeworks");
  const tComments = useTranslations("comments");
  const tDescriptions = useTranslations("descriptions");
  const locale = useLocale();
  const { toast } = useToast();
  const [homeworks, setHomeworks] = useState<HomeworkEntry[]>(
    initialData?.homeworks ?? [],
  );
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(
    initialData?.auditLogs ?? [],
  );
  const [viewer, setViewer] = useState<ViewerSummary>(
    initialData?.viewer ?? EMPTY_VIEWER,
  );
  const [loading, setLoading] = useState(!initialData);
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
  const [completionSaving, setCompletionSaving] = useState<
    Record<string, boolean>
  >({});

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
    if (initialData) {
      if (initialData.homeworks?.length) {
        void loadCommentCounts(initialData.homeworks);
      }
      return;
    }
    void loadHomeworks();
  }, [initialData, loadCommentCounts, loadHomeworks]);

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
      {homework.completion && (
        <Badge variant="success">{t("completedLabel")}</Badge>
      )}
      {homework.isMajor && <Badge variant="secondary">{t("tagMajor")}</Badge>}
      {homework.requiresTeam && <Badge variant="outline">{t("tagTeam")}</Badge>}
      {!homework.isMajor && !homework.requiresTeam && (
        <Badge variant="outline">{t("tagDefault")}</Badge>
      )}
    </div>
  );

  const handleCompletionToggle = async (
    homeworkId: string,
    nextCompleted: boolean,
  ) => {
    if (!viewer.isAuthenticated) return;
    setCompletionSaving((prev) => ({ ...prev, [homeworkId]: true }));
    try {
      const response = await fetch(`/api/homeworks/${homeworkId}/completion`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: nextCompleted }),
      });

      if (!response.ok) {
        toast({
          title: t("completionFailed"),
          variant: "destructive",
        });
        return;
      }

      const data = (await response.json()) as {
        completed: boolean;
        completedAt: string | null;
      };

      setHomeworks((prev) =>
        prev.map((homework) =>
          homework.id === homeworkId
            ? {
                ...homework,
                completion:
                  data.completed && data.completedAt
                    ? { completedAt: data.completedAt }
                    : null,
              }
            : homework,
        ),
      );
    } catch (err) {
      console.error("Failed to update completion", err);
      toast({
        title: t("completionFailed"),
        variant: "destructive",
      });
    } finally {
      setCompletionSaving((prev) => ({ ...prev, [homeworkId]: false }));
    }
  };

  const renderEditHelperActions = (target: "start" | "due") => {
    const setValue =
      target === "start" ? setEditSubmissionStartAt : setEditSubmissionDueAt;

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
          <CreateHomeworkSheet
            open={showCreate}
            onOpenChange={setShowCreate}
            canCreate={canCreate}
            isSaving={isSaving}
            newTitle={newTitle}
            newDescription={newDescription}
            newPublishedAt={newPublishedAt}
            newSubmissionStartAt={newSubmissionStartAt}
            newSubmissionDueAt={newSubmissionDueAt}
            newIsMajor={newIsMajor}
            newRequiresTeam={newRequiresTeam}
            onTitleChange={setNewTitle}
            onDescriptionChange={setNewDescription}
            onPublishedChange={setNewPublishedAt}
            onSubmissionStartChange={setNewSubmissionStartAt}
            onSubmissionDueChange={setNewSubmissionDueAt}
            onToggleMajor={setNewIsMajor}
            onToggleRequiresTeam={setNewRequiresTeam}
            onReset={resetCreateForm}
            onCreate={handleCreate}
            onApplyStartNow={applyStartNow}
            onApplyWeek={applyDueInAWeek}
            onApplySemesterEnd={applySemesterEnd}
            onApplySemesterStart={applySemesterStart}
            labels={{
              titleLabel: t("titleLabel"),
              titlePlaceholder: t("titlePlaceholder"),
              descriptionLabel: t("descriptionLabel"),
              descriptionPlaceholder: t("descriptionPlaceholder"),
              tabWrite: tComments("tabWrite"),
              tabPreview: tComments("tabPreview"),
              previewEmpty: tComments("previewEmpty"),
              markdownGuide: tComments("markdownGuide"),
              helperNow: t("helperNow"),
              helperWeek: t("helperWeek"),
              helperSemesterEnd: t("helperSemesterEnd"),
              helperSemesterStart: t("helperSemesterStart"),
              publishedAt: t("publishedAt"),
              helperPublishNow: t("helperPublishNow"),
              helperClear: t("helperClear"),
              submissionStart: t("submissionStart"),
              submissionDue: t("submissionDue"),
              tagMajor: t("tagMajor"),
              tagTeam: t("tagTeam"),
              cancel: t("cancel"),
              createAction: t("createAction"),
              showCreate: t("showCreate"),
              createTitle: t("createTitle"),
              saving: t("saving"),
            }}
          />
        ) : (
          <Button
            size="sm"
            variant="outline"
            render={<Link className="no-underline" href="/signin" />}
          >
            {t("loginToCreate")}
          </Button>
        )}
        <AuditLogSheet
          auditLogs={auditLogs}
          formatter={formatter}
          labels={{
            title: t("auditTitle"),
            empty: t("auditEmpty"),
            created: t("auditCreated"),
            deleted: t("auditDeleted"),
            meta: ({ name, date }: { name: string; date: string }) =>
              t("auditMeta", { name, date }),
            trigger: t("auditTitle"),
          }}
        />
      </div>

      {viewer.isSuspended && (
        <Card className="border-dashed bg-muted/40">
          <CardPanel className="space-y-2">
            <p className="text-muted-foreground text-sm">{t("suspended")}</p>
            {viewer.suspensionReason && (
              <p className="text-muted-foreground text-xs">
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
            <p className="text-muted-foreground text-sm">{error}</p>
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
                  <HomeworkCardHeader
                    homework={homework}
                    formatter={formatter}
                    commentCount={commentCounts[homework.id] ?? 0}
                    canEdit={canEdit}
                    isEditing={isEditing}
                    onEdit={() => startEditing(homework)}
                    t={t}
                  />
                </CardHeader>
                <CardPanel className="space-y-4">
                  {!isEditing && (
                    <HomeworkCardReadOnly
                      homework={homework}
                      formatter={formatter}
                      tagBadges={renderTagBadges(homework)}
                      isAuthenticated={viewer.isAuthenticated}
                      isSavingCompletion={Boolean(
                        completionSaving[homework.id],
                      )}
                      onToggleCompletion={(checked: boolean) =>
                        void handleCompletionToggle(homework.id, checked)
                      }
                      t={t}
                    />
                  )}

                  {isEditing && (
                    <HomeworkCardEditForm
                      homework={homework}
                      formatter={formatter}
                      editTitle={editTitle}
                      editDescription={editDescription}
                      editIsMajor={editIsMajor}
                      editRequiresTeam={editRequiresTeam}
                      editPublishedAt={editPublishedAt}
                      editSubmissionStartAt={editSubmissionStartAt}
                      editSubmissionDueAt={editSubmissionDueAt}
                      canDelete={canDelete}
                      isSaving={isSaving}
                      descriptionHistory={
                        descriptionHistory[homework.id] ?? {
                          loading: false,
                          error: null,
                          entries: [],
                        }
                      }
                      onTitleChange={setEditTitle}
                      onDescriptionChange={setEditDescription}
                      onToggleMajor={setEditIsMajor}
                      onToggleTeam={setEditRequiresTeam}
                      onPublishedChange={setEditPublishedAt}
                      onSubmissionStartChange={setEditSubmissionStartAt}
                      onSubmissionDueChange={setEditSubmissionDueAt}
                      onLoadHistory={() =>
                        void loadDescriptionHistory(homework.id)
                      }
                      onCancel={() => setEditingId(null)}
                      onSave={() => void handleUpdate(homework)}
                      onDelete={() => void handleDelete(homework)}
                      renderEditHelperActions={renderEditHelperActions}
                      t={t}
                      tComments={tComments}
                      tDescriptions={tDescriptions}
                    />
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

function CreateHomeworkSheet({
  open,
  onOpenChange,
  canCreate,
  isSaving,
  newTitle,
  newDescription,
  newPublishedAt,
  newSubmissionStartAt,
  newSubmissionDueAt,
  newIsMajor,
  newRequiresTeam,
  onTitleChange,
  onDescriptionChange,
  onPublishedChange,
  onSubmissionStartChange,
  onSubmissionDueChange,
  onToggleMajor,
  onToggleRequiresTeam,
  onReset,
  onCreate,
  onApplyStartNow,
  onApplyWeek,
  onApplySemesterEnd,
  onApplySemesterStart,
  labels,
}: CreateHomeworkSheetProps) {
  const renderHelperActions = (target: "start" | "due") => {
    const setValue =
      target === "start" ? onSubmissionStartChange : onSubmissionDueChange;

    return (
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onApplyStartNow(setValue)}
        >
          {labels.helperNow}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onApplyWeek(setValue)}>
          {labels.helperWeek}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onApplySemesterEnd(setValue)}
        >
          {labels.helperSemesterEnd}
        </Button>
        {target === "start" && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onApplySemesterStart(setValue)}
          >
            {labels.helperSemesterStart}
          </Button>
        )}
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger render={<Button size="sm" variant="outline" />}>
        {labels.showCreate}
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>{labels.createTitle}</SheetTitle>
        </SheetHeader>
        <SheetPanel className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="homework-title">{labels.titleLabel}</Label>
            <Input
              id="homework-title"
              value={newTitle}
              onChange={(event) => onTitleChange(event.target.value)}
              placeholder={labels.titlePlaceholder}
            />
          </div>

          <div className="space-y-2">
            <Label>{labels.descriptionLabel}</Label>
            <MarkdownEditor
              value={newDescription}
              onChange={onDescriptionChange}
              placeholder={labels.descriptionPlaceholder}
              tabWriteLabel={labels.tabWrite}
              tabPreviewLabel={labels.tabPreview}
              previewEmptyLabel={labels.previewEmpty}
              markdownGuideLabel={labels.markdownGuide}
              markdownGuideHref="/comments/guide"
            />
          </div>

          <Separator />

          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="homework-major"
                checked={newIsMajor}
                onCheckedChange={onToggleMajor}
              />
              <Label htmlFor="homework-major">{labels.tagMajor}</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="homework-team"
                checked={newRequiresTeam}
                onCheckedChange={onToggleRequiresTeam}
              />
              <Label htmlFor="homework-team">{labels.tagTeam}</Label>
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="homework-published">{labels.publishedAt}</Label>
              <Input
                id="homework-published"
                type="datetime-local"
                value={newPublishedAt}
                onChange={(event) => onPublishedChange(event.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    onPublishedChange(
                      toLocalInputValue(new Date().toISOString()),
                    )
                  }
                >
                  {labels.helperPublishNow}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onPublishedChange("")}
                >
                  {labels.helperClear}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="homework-start">{labels.submissionStart}</Label>
              <Input
                id="homework-start"
                type="datetime-local"
                value={newSubmissionStartAt}
                onChange={(event) =>
                  onSubmissionStartChange(event.target.value)
                }
              />
              {renderHelperActions("start")}
            </div>
            <div className="space-y-2">
              <Label htmlFor="homework-due">{labels.submissionDue}</Label>
              <Input
                id="homework-due"
                type="datetime-local"
                value={newSubmissionDueAt}
                onChange={(event) => onSubmissionDueChange(event.target.value)}
              />
              {renderHelperActions("due")}
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                onReset();
                onOpenChange(false);
              }}
            >
              {labels.cancel}
            </Button>
            <Button onClick={onCreate} disabled={isSaving || !canCreate}>
              {isSaving ? labels.saving : labels.createAction}
            </Button>
          </div>
        </SheetPanel>
      </SheetContent>
    </Sheet>
  );
}

function HomeworkCardHeader({
  homework,
  formatter,
  commentCount,
  canEdit,
  isEditing,
  onEdit,
  t,
}: HomeworkCardHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="space-y-1">
        <CardTitle className="text-base">{homework.title}</CardTitle>
        <p className="text-muted-foreground text-xs">
          {t("createdAt", {
            date: formatter.format(new Date(homework.createdAt)),
          })}
        </p>
      </div>
      <CardAction className="flex flex-wrap gap-2 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
        <Sheet>
          <SheetTrigger render={<Button size="sm" variant="outline" />}>
            {t("commentsAction")} ({commentCount})
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
          <Button size="sm" variant="outline" onClick={onEdit}>
            {t("editAction")}
          </Button>
        )}
      </CardAction>
    </div>
  );
}

function HomeworkCardReadOnly({
  homework,
  formatter,
  tagBadges,
  isAuthenticated,
  isSavingCompletion,
  onToggleCompletion,
  t,
}: HomeworkCardReadOnlyProps) {
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs">{t("submissionDue")}</p>
          <p className="font-semibold text-foreground text-xl">
            {homework.submissionDueAt
              ? formatter.format(new Date(homework.submissionDueAt))
              : t("dateTBD")}
          </p>
        </div>
      </div>
      <div className="rounded-lg border border-border/60 bg-muted/5 px-3 py-3">
        {homework.description?.content ? (
          <CommentMarkdown content={homework.description.content} />
        ) : (
          <p className="text-muted-foreground text-sm">
            {t("descriptionEmpty")}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-muted-foreground text-xs">
        <div className="space-y-1 text-muted-foreground text-xs">
          <p>
            {t("submissionStart")} ·{" "}
            {homework.submissionStartAt
              ? formatter.format(new Date(homework.submissionStartAt))
              : t("dateTBD")}
          </p>
          <p>
            {t("publishedAt")} ·{" "}
            {homework.publishedAt
              ? formatter.format(new Date(homework.publishedAt))
              : t("dateTBD")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {tagBadges}
          {isAuthenticated && (
            <div className="flex items-center gap-2">
              <Switch
                id={`homework-completed-${homework.id}`}
                checked={Boolean(homework.completion)}
                onCheckedChange={onToggleCompletion}
                disabled={isSavingCompletion}
              />
              <Label htmlFor={`homework-completed-${homework.id}`}>
                {t("completedLabel")}
              </Label>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function HomeworkCardEditForm({
  homework,
  formatter,
  editTitle,
  editDescription,
  editIsMajor,
  editRequiresTeam,
  editPublishedAt,
  editSubmissionStartAt,
  editSubmissionDueAt,
  canDelete,
  isSaving,
  descriptionHistory,
  onTitleChange,
  onDescriptionChange,
  onToggleMajor,
  onToggleTeam,
  onPublishedChange,
  onSubmissionStartChange,
  onSubmissionDueChange,
  onLoadHistory,
  onCancel,
  onSave,
  onDelete,
  renderEditHelperActions,
  t,
  tComments,
  tDescriptions,
}: HomeworkCardEditFormProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`homework-edit-title-${homework.id}`}>
          {t("titleLabel")}
        </Label>
        <Input
          id={`homework-edit-title-${homework.id}`}
          value={editTitle}
          onChange={(event) => onTitleChange(event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>{t("descriptionLabel")}</Label>
        <MarkdownEditor
          value={editDescription}
          onChange={onDescriptionChange}
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
            onCheckedChange={onToggleMajor}
          />
          <Label htmlFor={`homework-edit-major-${homework.id}`}>
            {t("tagMajor")}
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id={`homework-edit-team-${homework.id}`}
            checked={editRequiresTeam}
            onCheckedChange={onToggleTeam}
          />
          <Label htmlFor={`homework-edit-team-${homework.id}`}>
            {t("tagTeam")}
          </Label>
        </div>
      </div>

      <Separator />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor={`homework-edit-publish-${homework.id}`}>
            {t("publishedAt")}
          </Label>
          <Input
            id={`homework-edit-publish-${homework.id}`}
            type="datetime-local"
            value={editPublishedAt}
            onChange={(event) => onPublishedChange(event.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                onPublishedChange(toLocalInputValue(new Date().toISOString()))
              }
            >
              {t("helperPublishNow")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onPublishedChange("")}
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
            onChange={(event) => onSubmissionStartChange(event.target.value)}
          />
          {renderEditHelperActions("start")}
        </div>
        <div className="space-y-2">
          <Label htmlFor={`homework-edit-due-${homework.id}`}>
            {t("submissionDue")}
          </Label>
          <Input
            id={`homework-edit-due-${homework.id}`}
            type="datetime-local"
            value={editSubmissionDueAt}
            onChange={(event) => onSubmissionDueChange(event.target.value)}
          />
          {renderEditHelperActions("due")}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <Sheet
            onOpenChange={(open) => {
              if (open) {
                onLoadHistory();
              }
            }}
          >
            <SheetTrigger render={<Button size="sm" variant="outline" />}>
              {t("contentHistoryAction")}
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>
                  {tDescriptions("historyTitle", {
                    count: descriptionHistory.entries?.length ?? 0,
                  })}
                </SheetTitle>
              </SheetHeader>
              <SheetPanel className="space-y-4">
                {descriptionHistory.loading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : descriptionHistory.error ? (
                  <p className="text-muted-foreground text-sm">
                    {descriptionHistory.error}
                  </p>
                ) : descriptionHistory.entries?.length ? (
                  descriptionHistory.entries.map((entry) => {
                    const editorName =
                      entry.editor?.name ||
                      entry.editor?.username ||
                      tDescriptions("editorUnknown");
                    return (
                      <div
                        key={entry.id}
                        className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 text-muted-foreground text-xs">
                          <span>{editorName}</span>
                          <span>
                            {formatter.format(new Date(entry.createdAt))}
                          </span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <p className="text-muted-foreground text-xs">
                            {tDescriptions("previousLabel")}
                          </p>
                          <div className="rounded-md border border-border/60 bg-background px-3 py-2">
                            {entry.previousContent ? (
                              <CommentMarkdown
                                content={entry.previousContent}
                              />
                            ) : (
                              <p className="text-muted-foreground text-sm">
                                {tDescriptions("emptyValue")}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2 text-sm">
                          <p className="text-muted-foreground text-xs">
                            {tDescriptions("updatedLabel")}
                          </p>
                          <div className="rounded-md border border-border/60 bg-background px-3 py-2">
                            {entry.nextContent ? (
                              <CommentMarkdown content={entry.nextContent} />
                            ) : (
                              <p className="text-muted-foreground text-sm">
                                {tDescriptions("emptyValue")}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-muted-foreground text-sm">
                    {tDescriptions("historyEmpty")}
                  </p>
                )}
              </SheetPanel>
            </SheetContent>
          </Sheet>
          {canDelete && (
            <AlertDialog>
              <AlertDialogTrigger render={<Button size="sm" variant="ghost" />}>
                {t("deleteAction")}
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("deleteDescription", {
                      title: homework.title,
                    })}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogClose render={<Button variant="ghost" />}>
                    {t("cancel")}
                  </AlertDialogClose>
                  <Button
                    variant="destructive"
                    onClick={onDelete}
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
          <Button variant="ghost" onClick={onCancel}>
            {t("cancel")}
          </Button>
          <Button onClick={onSave} disabled={isSaving}>
            {isSaving ? t("saving") : t("saveChanges")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function AuditLogSheet({ auditLogs, formatter, labels }: AuditLogSheetProps) {
  return (
    <Sheet>
      <SheetTrigger render={<Button size="sm" variant="outline" />}>
        {labels.trigger}
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>{labels.title}</SheetTitle>
        </SheetHeader>
        <SheetPanel>
          {auditLogs.length === 0 ? (
            <p className="text-muted-foreground text-sm">{labels.empty}</p>
          ) : (
            <div className="space-y-3">
              {auditLogs.map((log) => {
                const actorName =
                  log.actor?.name || log.actor?.username || labels.trigger;
                const actionLabel =
                  log.action === "deleted" ? labels.deleted : labels.created;
                return (
                  <div
                    key={log.id}
                    className={cn(
                      "flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2",
                      "border border-border/60 bg-muted/40",
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <Badge
                        variant={
                          log.action === "deleted" ? "destructive" : "secondary"
                        }
                      >
                        {actionLabel}
                      </Badge>
                      <span className="font-medium text-foreground">
                        {log.titleSnapshot}
                      </span>
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {labels.meta({
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
  );
}
