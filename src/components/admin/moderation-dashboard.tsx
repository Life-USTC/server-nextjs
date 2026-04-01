"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { DataState } from "@/components/data-state";
import { FiltersBar, FiltersBarSearch } from "@/components/filters/filters-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Link } from "@/i18n/routing";
import { apiClient, extractApiErrorMessage } from "@/lib/api/client";
import {
  adminCommentsResponseSchema,
  adminDescriptionsResponseSchema,
} from "@/lib/api/schemas";
import { logClientError } from "@/lib/log/app-logger";
import { toShanghaiIsoString } from "@/lib/time/serialize-date-output";
import {
  addShanghaiTime,
  createShanghaiDateTimeFormatter,
  parseShanghaiDateTimeLocalInput,
} from "@/lib/time/shanghai-format";
import { stableSkeletonKeys } from "@/lib/ui/skeleton-keys";

type CommentStatus = "active" | "softbanned" | "deleted";
type CommentStatusFilter = CommentStatus | "suspended" | "all";

type AdminComment = {
  id: string;
  body: string;
  status: CommentStatus;
  isAnonymous: boolean;
  authorName: string | null;
  userId: string | null;
  createdAt: string;
  moderationNote: string | null;
  user: { name: string | null } | null;
  section: {
    jwId: number | null;
    code: string | null;
    course: { jwId: number; code: string; nameCn: string } | null;
  } | null;
  course: {
    jwId: number;
    code: string;
    nameCn: string;
  } | null;
  teacher: { id: number; nameCn: string } | null;
  homework: {
    id: string;
    title: string;
    section: { code: string | null } | null;
  } | null;
  sectionTeacher: {
    section: {
      jwId: number | null;
      code: string | null;
      course: { jwId: number; code: string; nameCn: string } | null;
    } | null;
    teacher: { nameCn: string } | null;
  } | null;
};

type AdminDescription = {
  id: string;
  content: string;
  lastEditedAt: string | null;
  updatedAt: string;
  lastEditedBy: { id: string; name: string | null } | null;
  section: {
    jwId: number | null;
    code: string | null;
    course: { jwId: number; code: string; nameCn: string } | null;
  } | null;
  course: { jwId: number; code: string; nameCn: string } | null;
  teacher: { id: number; nameCn: string } | null;
  homework: {
    id: string;
    title: string;
    section: {
      code: string | null;
      course: { jwId: number; code: string; nameCn: string } | null;
    } | null;
  } | null;
};

const DURATION_OPTIONS = [
  { value: "1d", labelKey: "duration1Day" },
  { value: "3d", labelKey: "duration3Days" },
  { value: "7d", labelKey: "duration1Week" },
  { value: "30d", labelKey: "duration1Month" },
  { value: "permanent", labelKey: "durationPermanent" },
  { value: "custom", labelKey: "durationCustom" },
] as const;

type CommentFiltersProps = {
  searchQuery: string;
  statusFilter: CommentStatusFilter;
  showStatusFilter?: boolean;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: CommentStatusFilter) => void;
  t: ReturnType<typeof useTranslations>;
};

type CommentsTableProps = {
  comments: AdminComment[];
  formatTimestamp: (value: string | Date) => string;
  onSelect: (comment: AdminComment) => void;
  getTargetLink: (comment: AdminComment) => { href: string; label: string };
  t: ReturnType<typeof useTranslations>;
};

type DescriptionDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  description: AdminDescription | null;
  formatTimestamp: (value: string | Date) => string;
  t: ReturnType<typeof useTranslations>;
};

type DescriptionContentFilter = "all" | "withContent" | "empty";

type DescriptionFiltersProps = {
  searchQuery: string;
  contentFilter: DescriptionContentFilter;
  onSearchChange: (value: string) => void;
  onContentChange: (value: DescriptionContentFilter) => void;
  t: ReturnType<typeof useTranslations>;
};

type DescriptionsTableProps = {
  descriptions: AdminDescription[];
  formatTimestamp: (value: string | Date) => string;
  onSelect: (description: AdminDescription) => void;
  t: ReturnType<typeof useTranslations>;
};

type CommentDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  comment: AdminComment | null;
  updateStatus: CommentStatus;
  updateNote: string;
  suspendDuration: string;
  suspendExpiresAt: string;
  suspendReason: string;
  onUpdateStatus: () => void;
  onSuspendUser: () => void;
  onStatusChange: (value: CommentStatus) => void;
  onNoteChange: (value: string) => void;
  onDurationChange: (value: string) => void;
  onExpiresChange: (value: string) => void;
  onReasonChange: (value: string) => void;
  formatTimestamp: (value: string | Date) => string;
  t: ReturnType<typeof useTranslations>;
};

export function ModerationDashboard() {
  const locale = useLocale();
  const t = useTranslations("moderation");
  const { toast } = useToast();
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [descriptions, setDescriptions] = useState<AdminDescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] =
    useState<CommentStatusFilter>("active");
  // Note: descriptionTargetTab was used by the previous nested-tab design.
  const [descriptionContentFilter, setDescriptionContentFilter] =
    useState<DescriptionContentFilter>("withContent");
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedComment, setSelectedComment] = useState<AdminComment | null>(
    null,
  );
  const [updateStatus, setUpdateStatus] = useState<CommentStatus>("active");
  const [updateNote, setUpdateNote] = useState("");

  const [suspendDuration, setSuspendDuration] = useState("3d");
  const [suspendExpiresAt, setSuspendExpiresAt] = useState("");
  const [suspendReason, setSuspendReason] = useState("");

  const [descriptionDialogOpen, setDescriptionDialogOpen] = useState(false);
  const [selectedDescription, setSelectedDescription] =
    useState<AdminDescription | null>(null);
  const dateTimeFormatter = useMemo(
    () =>
      createShanghaiDateTimeFormatter(locale, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [locale],
  );

  const formatTimestamp = useCallback(
    (value: string | Date) => dateTimeFormatter.format(new Date(value)),
    [dateTimeFormatter],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const commentPromise =
        statusFilter === "all"
          ? apiClient.GET("/api/admin/comments")
          : apiClient.GET("/api/admin/comments", {
              params: {
                query: { status: statusFilter },
              },
            });

      const descriptionsPromise = apiClient.GET("/api/admin/descriptions", {
        params: {
          query: { targetType: "all", hasContent: "withContent", limit: "200" },
        },
      });

      const [commentResult, descriptionsResult] = await Promise.all([
        commentPromise,
        descriptionsPromise,
      ]);

      if (commentResult.response.ok && commentResult.data) {
        const parsed = adminCommentsResponseSchema.safeParse(
          commentResult.data,
        );
        if (parsed.success) {
          setComments(parsed.data.comments);
        } else {
          const maybe = commentResult.data as unknown as {
            comments?: unknown;
          };
          if (Array.isArray(maybe.comments)) {
            setComments(maybe.comments as AdminComment[]);
          }
        }
      }

      if (descriptionsResult.response.ok && descriptionsResult.data) {
        const parsed = adminDescriptionsResponseSchema.safeParse(
          descriptionsResult.data,
        );
        if (parsed.success) {
          setDescriptions(parsed.data.descriptions as AdminDescription[]);
        } else {
          const maybe = descriptionsResult.data as unknown as {
            descriptions?: unknown;
          };
          if (Array.isArray(maybe.descriptions)) {
            setDescriptions(maybe.descriptions as AdminDescription[]);
          }
        }
      }
    } catch (error) {
      logClientError("Failed to load moderation data", error, {
        component: "ModerationDashboard",
      });
      setError(t("updateFailed"));
      toast({
        title: t("updateFailed"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, t, toast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const getTargetLink = (comment: AdminComment) => {
    let url = "/";
    let label = t("unknownTarget");

    if (comment.homework?.id) {
      url = `/comments/${comment.id}`;
      const sectionCode = comment.homework.section?.code ?? "";
      const homeworkTitle = comment.homework.title ?? "";
      label = [sectionCode, homeworkTitle].filter(Boolean).join(" · ");
    } else if (comment.sectionTeacher?.section?.jwId) {
      url = `/sections/${comment.sectionTeacher.section.jwId}`;
      label =
        comment.sectionTeacher.section.course?.nameCn ??
        comment.sectionTeacher.section.code ??
        t("unknownTarget");
    } else if (comment.section?.jwId) {
      url = `/sections/${comment.section.jwId}`;
      label =
        comment.section.course?.nameCn ??
        comment.section.code ??
        t("unknownTarget");
    } else if (comment.course?.jwId) {
      url = `/courses/${comment.course.jwId}`;
      label =
        comment.course.nameCn ?? comment.course.code ?? t("unknownTarget");
    } else if (comment.teacher?.id) {
      url = `/teachers/${comment.teacher.id}`;
      label = comment.teacher.nameCn;
    }

    return {
      href: `${url}#comment-${comment.id}`,
      label,
    };
  };

  const openDetailDialog = (comment: AdminComment) => {
    setSelectedComment(comment);
    setUpdateStatus(comment.status);
    setUpdateNote(comment.moderationNote ?? "");
    setSuspendDuration("3d");
    setSuspendExpiresAt("");

    const targetLink = getTargetLink(comment);
    const date = formatTimestamp(comment.createdAt);
    const bodySnippet =
      comment.body.length > 50
        ? `${comment.body.slice(0, 50)}...`
        : comment.body;
    const reason = t("defaultBanReason", {
      date,
      url: window.location.origin + targetLink.href,
      content: bodySnippet,
    });
    setSuspendReason(reason);
    setDetailDialogOpen(true);
  };

  const openDescriptionDialog = (description: AdminDescription) => {
    setSelectedDescription(description);
    setDescriptionDialogOpen(true);
  };

  const calculateExpiresAt = () => {
    if (suspendDuration === "permanent") return undefined;
    if (suspendDuration === "custom") {
      const parsed = parseShanghaiDateTimeLocalInput(suspendExpiresAt);
      return parsed ? toShanghaiIsoString(parsed) : undefined;
    }

    const amount =
      suspendDuration === "1d"
        ? 1
        : suspendDuration === "3d"
          ? 3
          : suspendDuration === "7d"
            ? 7
            : suspendDuration === "30d"
              ? 30
              : null;

    return amount === null
      ? undefined
      : toShanghaiIsoString(addShanghaiTime(new Date(), amount, "day"));
  };

  const handleUpdateStatus = async () => {
    if (!selectedComment) return;
    try {
      const result = await apiClient.PATCH("/api/admin/comments/{id}", {
        params: {
          path: { id: selectedComment.id },
        },
        body: {
          status: updateStatus,
          moderationNote: updateNote.trim() || null,
        },
      });

      if (!result.response.ok) {
        const apiMessage = extractApiErrorMessage(result.error);
        throw new Error(apiMessage ?? "Failed to update comment");
      }
      toast({
        title: t("updateSuccess"),
        variant: "success",
      });
      await loadData();
      setDetailDialogOpen(false);
    } catch (error) {
      logClientError("Failed to update comment", error, {
        component: "ModerationDashboard",
        commentId: selectedComment?.id ?? null,
      });
      toast({
        title: t("updateFailed"),
        variant: "destructive",
      });
    }
  };

  const handleSuspendUser = async () => {
    if (!selectedComment?.userId) return;
    try {
      const expiresAt = calculateExpiresAt();
      const result = await apiClient.POST("/api/admin/suspensions", {
        body: {
          userId: selectedComment.userId,
          reason: suspendReason.trim() || undefined,
          expiresAt,
        },
      });

      if (!result.response.ok) {
        const apiMessage = extractApiErrorMessage(result.error);
        throw new Error(apiMessage ?? "Failed to suspend user");
      }
      toast({
        title: t("suspendSuccess"),
        variant: "success",
      });
      await loadData();
      setDetailDialogOpen(false);
    } catch (error) {
      logClientError("Failed to suspend user", error, {
        component: "ModerationDashboard",
        commentId: selectedComment?.id ?? null,
      });
      toast({
        title: t("suspendFailed"),
        variant: "destructive",
      });
    }
  };

  // Suspensions tab removed; lifting suspensions is not handled here.

  const filteredComments = useMemo(() => {
    const query = deferredSearchQuery.trim().toLowerCase();
    if (!query) return comments;
    return comments.filter(
      (c) =>
        c.body?.toLowerCase().includes(query) ||
        c.user?.name?.toLowerCase().includes(query) ||
        c.authorName?.toLowerCase().includes(query),
    );
  }, [comments, deferredSearchQuery]);

  const filteredDescriptionsAll = useMemo(() => {
    const query = deferredSearchQuery.trim().toLowerCase();
    return descriptions.filter((d) => {
      const hasContent = Boolean(d.content?.trim());
      if (descriptionContentFilter === "withContent" && !hasContent)
        return false;
      if (descriptionContentFilter === "empty" && hasContent) return false;

      if (!query) return true;
      const haystack = [
        d.content,
        d.homework?.title ?? "",
        d.homework?.section?.code ?? "",
        d.homework?.section?.course?.code ?? "",
        d.homework?.section?.course?.nameCn ?? "",
        d.course?.code ?? "",
        d.course?.nameCn ?? "",
        d.section?.code ?? "",
        d.section?.course?.code ?? "",
        d.section?.course?.nameCn ?? "",
        d.teacher?.nameCn ?? "",
        d.lastEditedBy?.name ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [deferredSearchQuery, descriptions, descriptionContentFilter]);

  const filteredDescriptionsHomework = useMemo(
    () => filteredDescriptionsAll.filter((d) => Boolean(d.homework)),
    [filteredDescriptionsAll],
  );
  const filteredDescriptionsCourse = useMemo(
    () => filteredDescriptionsAll.filter((d) => Boolean(d.course)),
    [filteredDescriptionsAll],
  );
  const filteredDescriptionsSection = useMemo(
    () => filteredDescriptionsAll.filter((d) => Boolean(d.section)),
    [filteredDescriptionsAll],
  );
  const filteredDescriptionsTeacher = useMemo(
    () => filteredDescriptionsAll.filter((d) => Boolean(d.teacher)),
    [filteredDescriptionsAll],
  );

  return (
    <>
      <Tabs defaultValue="comments">
        <TabsList variant="pill">
          <TabsTab value="comments" variant="pill">
            {t("commentsTab")} ({comments.length})
          </TabsTab>
          <TabsTab value="description-homework" variant="pill">
            {t("descriptionTargetHomework")} (
            {filteredDescriptionsHomework.length})
          </TabsTab>
          <TabsTab value="description-course" variant="pill">
            {t("descriptionTargetCourse")} ({filteredDescriptionsCourse.length})
          </TabsTab>
          <TabsTab value="description-section" variant="pill">
            {t("descriptionTargetSection")} (
            {filteredDescriptionsSection.length})
          </TabsTab>
          <TabsTab value="description-teacher" variant="pill">
            {t("descriptionTargetTeacher")} (
            {filteredDescriptionsTeacher.length})
          </TabsTab>
        </TabsList>

        <TabsPanel value="comments">
          <CommentFilters
            searchQuery={searchQuery}
            statusFilter={statusFilter}
            onSearchChange={setSearchQuery}
            onStatusChange={setStatusFilter}
            t={t}
          />

          <DataState
            loading={loading}
            error={error}
            onRetry={() => void loadData()}
            retryLabel={t("retry")}
            empty={filteredComments.length === 0}
            emptyDescription={t("noResults")}
            loadingFallback={<ModerationTableSkeleton />}
          >
            <div className="space-y-3">
              <p className="text-muted-foreground text-sm">
                {t("showingResults", { count: filteredComments.length })}
              </p>
              <CommentsTable
                comments={filteredComments}
                formatTimestamp={formatTimestamp}
                onSelect={openDetailDialog}
                getTargetLink={getTargetLink}
                t={t}
              />
            </div>
          </DataState>
        </TabsPanel>

        <TabsPanel value="description-homework">
          <DescriptionFilters
            searchQuery={searchQuery}
            contentFilter={descriptionContentFilter}
            onSearchChange={setSearchQuery}
            onContentChange={setDescriptionContentFilter}
            t={t}
          />

          <DataState
            loading={loading}
            error={error}
            onRetry={() => void loadData()}
            retryLabel={t("retry")}
            empty={filteredDescriptionsHomework.length === 0}
            emptyDescription={t("noResults")}
            loadingFallback={<ModerationTableSkeleton />}
          >
            <div className="space-y-3">
              <p className="text-muted-foreground text-sm">
                {t("showingResults", {
                  count: filteredDescriptionsHomework.length,
                })}
              </p>
              <DescriptionsTable
                descriptions={filteredDescriptionsHomework}
                formatTimestamp={formatTimestamp}
                onSelect={openDescriptionDialog}
                t={t}
              />
            </div>
          </DataState>
        </TabsPanel>

        <TabsPanel value="description-course">
          <DescriptionFilters
            searchQuery={searchQuery}
            contentFilter={descriptionContentFilter}
            onSearchChange={setSearchQuery}
            onContentChange={setDescriptionContentFilter}
            t={t}
          />

          <DataState
            loading={loading}
            error={error}
            onRetry={() => void loadData()}
            retryLabel={t("retry")}
            empty={filteredDescriptionsCourse.length === 0}
            emptyDescription={t("noResults")}
            loadingFallback={<ModerationTableSkeleton />}
          >
            <div className="space-y-3">
              <p className="text-muted-foreground text-sm">
                {t("showingResults", {
                  count: filteredDescriptionsCourse.length,
                })}
              </p>
              <DescriptionsTable
                descriptions={filteredDescriptionsCourse}
                formatTimestamp={formatTimestamp}
                onSelect={openDescriptionDialog}
                t={t}
              />
            </div>
          </DataState>
        </TabsPanel>

        <TabsPanel value="description-section">
          <DescriptionFilters
            searchQuery={searchQuery}
            contentFilter={descriptionContentFilter}
            onSearchChange={setSearchQuery}
            onContentChange={setDescriptionContentFilter}
            t={t}
          />

          <DataState
            loading={loading}
            error={error}
            onRetry={() => void loadData()}
            retryLabel={t("retry")}
            empty={filteredDescriptionsSection.length === 0}
            emptyDescription={t("noResults")}
            loadingFallback={<ModerationTableSkeleton />}
          >
            <div className="space-y-3">
              <p className="text-muted-foreground text-sm">
                {t("showingResults", {
                  count: filteredDescriptionsSection.length,
                })}
              </p>
              <DescriptionsTable
                descriptions={filteredDescriptionsSection}
                formatTimestamp={formatTimestamp}
                onSelect={openDescriptionDialog}
                t={t}
              />
            </div>
          </DataState>
        </TabsPanel>

        <TabsPanel value="description-teacher">
          <DescriptionFilters
            searchQuery={searchQuery}
            contentFilter={descriptionContentFilter}
            onSearchChange={setSearchQuery}
            onContentChange={setDescriptionContentFilter}
            t={t}
          />

          <DataState
            loading={loading}
            error={error}
            onRetry={() => void loadData()}
            retryLabel={t("retry")}
            empty={filteredDescriptionsTeacher.length === 0}
            emptyDescription={t("noResults")}
            loadingFallback={<ModerationTableSkeleton />}
          >
            <div className="space-y-3">
              <p className="text-muted-foreground text-sm">
                {t("showingResults", {
                  count: filteredDescriptionsTeacher.length,
                })}
              </p>
              <DescriptionsTable
                descriptions={filteredDescriptionsTeacher}
                formatTimestamp={formatTimestamp}
                onSelect={openDescriptionDialog}
                t={t}
              />
            </div>
          </DataState>
        </TabsPanel>
      </Tabs>

      <CommentDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        comment={selectedComment}
        updateStatus={updateStatus}
        updateNote={updateNote}
        suspendDuration={suspendDuration}
        suspendExpiresAt={suspendExpiresAt}
        suspendReason={suspendReason}
        onUpdateStatus={handleUpdateStatus}
        onSuspendUser={handleSuspendUser}
        onStatusChange={setUpdateStatus}
        onNoteChange={setUpdateNote}
        onDurationChange={(value) => setSuspendDuration(value ?? "3d")}
        onExpiresChange={setSuspendExpiresAt}
        onReasonChange={setSuspendReason}
        formatTimestamp={formatTimestamp}
        t={t}
      />

      <DescriptionDetailDialog
        open={descriptionDialogOpen}
        onOpenChange={setDescriptionDialogOpen}
        description={selectedDescription}
        formatTimestamp={formatTimestamp}
        t={t}
      />
    </>
  );
}

function ModerationTableSkeleton() {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border/70 bg-card/72">
        <div className="p-4">
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="space-y-0 border-border/60 border-t">
          {stableSkeletonKeys(6, "moderation-row").map((key) => (
            <div
              key={key}
              className="flex items-center gap-4 border-border/60 border-b px-4 py-3 last:border-b-0"
            >
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CommentFilters({
  searchQuery,
  statusFilter,
  showStatusFilter = true,
  onSearchChange,
  onStatusChange,
  t,
}: CommentFiltersProps) {
  return (
    <FiltersBar>
      <FiltersBarSearch
        value={searchQuery}
        onChange={onSearchChange}
        placeholder={t("searchPlaceholder")}
      />
      {showStatusFilter && (
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            const next: CommentStatusFilter =
              value === "all" ||
              value === "active" ||
              value === "softbanned" ||
              value === "deleted" ||
              value === "suspended"
                ? value
                : "active";
            onStatusChange(next);
          }}
          items={[
            { value: "all", label: t("filterAll") },
            { value: "active", label: t("filterActive") },
            { value: "softbanned", label: t("filterSoftbanned") },
            { value: "deleted", label: t("filterDeleted") },
            { value: "suspended", label: t("filterSuspended") },
          ]}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectPopup>
            <SelectItem value="all">{t("filterAll")}</SelectItem>
            <SelectItem value="active">{t("filterActive")}</SelectItem>
            <SelectItem value="softbanned">{t("filterSoftbanned")}</SelectItem>
            <SelectItem value="deleted">{t("filterDeleted")}</SelectItem>
            <SelectItem value="suspended">{t("filterSuspended")}</SelectItem>
          </SelectPopup>
        </Select>
      )}
    </FiltersBar>
  );
}

function DescriptionFilters({
  searchQuery,
  contentFilter,
  onSearchChange,
  onContentChange,
  t,
}: DescriptionFiltersProps) {
  return (
    <FiltersBar>
      <FiltersBarSearch
        value={searchQuery}
        onChange={onSearchChange}
        placeholder={t("searchPlaceholder")}
      />

      <Select
        value={contentFilter}
        onValueChange={(value) => {
          const next: DescriptionContentFilter =
            value === "all" || value === "withContent" || value === "empty"
              ? value
              : "withContent";
          onContentChange(next);
        }}
        items={[
          { value: "withContent", label: t("descriptionContentWith") },
          { value: "empty", label: t("descriptionContentEmpty") },
          { value: "all", label: t("filterAll") },
        ]}
      >
        <SelectTrigger className="w-full sm:w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectPopup>
          <SelectItem value="withContent">
            {t("descriptionContentWith")}
          </SelectItem>
          <SelectItem value="empty">{t("descriptionContentEmpty")}</SelectItem>
          <SelectItem value="all">{t("filterAll")}</SelectItem>
        </SelectPopup>
      </Select>
    </FiltersBar>
  );
}

function CommentsTable({
  comments,
  formatTimestamp,
  onSelect,
  getTargetLink,
  t,
}: CommentsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("content")}</TableHead>
          <TableHead>{t("author")}</TableHead>
          <TableHead>{t("postedIn")}</TableHead>
          <TableHead>{t("createdAt")}</TableHead>
          <TableHead>{t("status")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {comments.map((comment) => {
          const authorName =
            comment.user?.name ?? comment.authorName ?? t("guestLabel");
          const target = getTargetLink(comment);
          const statusLabel =
            comment.status === "softbanned"
              ? t("statusSoftbanned")
              : comment.status === "deleted"
                ? t("statusDeleted")
                : t("statusActive");

          return (
            <TableRow
              key={comment.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onSelect(comment)}
            >
              <TableCell className="max-w-md">
                <p className="line-clamp-2 text-sm">{comment.body}</p>
              </TableCell>
              <TableCell className="font-medium">{authorName}</TableCell>
              <TableCell className="max-w-sm text-sm">{target.label}</TableCell>
              <TableCell className="text-muted-foreground text-xs">
                {formatTimestamp(comment.createdAt)}
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    comment.status === "active"
                      ? "default"
                      : comment.status === "softbanned"
                        ? "secondary"
                        : "outline"
                  }
                >
                  {statusLabel}
                </Badge>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function DescriptionsTable({
  descriptions,
  formatTimestamp,
  onSelect,
  t,
}: DescriptionsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("descriptionPreview")}</TableHead>
          <TableHead>{t("author")}</TableHead>
          <TableHead>{t("postedIn")}</TableHead>
          <TableHead>{t("createdAt")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {descriptions.map((d) => {
          const target = d.homework?.id
            ? {
                href: `/homeworks/${d.homework.id}`,
                label: d.homework.title ?? "—",
              }
            : d.section?.jwId
              ? {
                  href: `/sections/${d.section.jwId}`,
                  label: d.section.course?.nameCn ?? "—",
                }
              : d.course?.jwId
                ? {
                    href: `/courses/${d.course.jwId}`,
                    label: d.course.nameCn ?? "—",
                  }
                : d.teacher?.id
                  ? {
                      href: `/teachers/${d.teacher.id}`,
                      label: d.teacher.nameCn,
                    }
                  : { href: "/", label: "—" };

          const authorName = d.lastEditedBy?.name ?? "—";
          const createdLabel = d.lastEditedAt ?? d.updatedAt;

          return (
            <TableRow
              key={d.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onSelect(d)}
            >
              <TableCell className="max-w-md font-medium">
                <p className="line-clamp-2 whitespace-pre-wrap text-sm">
                  {d.content?.trim() ? d.content : "—"}
                </p>
              </TableCell>
              <TableCell className="font-medium">{authorName}</TableCell>
              <TableCell className="max-w-sm text-sm">{target.label}</TableCell>
              <TableCell className="text-muted-foreground text-xs">
                {formatTimestamp(createdLabel)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function DescriptionDetailDialog({
  open,
  onOpenChange,
  description,
  formatTimestamp,
  t,
}: DescriptionDetailDialogProps) {
  const adminUserHref = description?.lastEditedBy?.id
    ? `/admin/users?search=${encodeURIComponent(description.lastEditedBy.id)}`
    : null;
  const target = description?.homework?.id
    ? {
        href: `/homeworks/${description.homework.id}`,
        label: description.homework.title ?? "—",
      }
    : description?.section?.jwId
      ? {
          href: `/sections/${description.section.jwId}`,
          label: description.section.course?.nameCn ?? "—",
        }
      : description?.course?.jwId
        ? {
            href: `/courses/${description.course.jwId}`,
            label: description.course.nameCn ?? "—",
          }
        : description?.teacher?.id
          ? {
              href: `/teachers/${description.teacher.id}`,
              label: description.teacher.nameCn,
            }
          : { href: "/", label: "—" };

  const authorName = description?.lastEditedBy?.name ?? "—";
  const createdLabel =
    description?.lastEditedAt ?? description?.updatedAt ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("manageDescription")}</DialogTitle>
          <DialogDescription>{t("clickToManage")}</DialogDescription>
        </DialogHeader>
        {description ? (
          <DialogPanel className="space-y-4">
            <div className="rounded-md bg-muted/50 p-3">
              <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground text-xs">
                    {t("author")}
                  </dt>
                  <dd className="font-medium">{authorName}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">
                    {t("postedIn")}
                  </dt>
                  <dd className="font-medium">{target.label}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">
                    {t("createdAt")}
                  </dt>
                  <dd className="font-medium">
                    {createdLabel ? formatTimestamp(createdLabel) : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">ID</dt>
                  <dd className="font-mono text-xs">{description.id}</dd>
                </div>
              </dl>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-sm">{t("content")}</h4>
              <div className="rounded-md border bg-card p-3">
                <p className="whitespace-pre-wrap text-sm">
                  {description.content?.trim() ? description.content : "—"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                render={<Link href={target.href} />}
              >
                {t("openTarget")}
              </Button>
              {adminUserHref ? (
                <Button
                  size="sm"
                  variant="outline"
                  render={<Link href={adminUserHref} />}
                >
                  {t("manageUser")}
                </Button>
              ) : null}
            </div>
          </DialogPanel>
        ) : null}
      </DialogPopup>
    </Dialog>
  );
}

function CommentDetailDialog({
  open,
  onOpenChange,
  comment,
  updateStatus,
  updateNote,
  suspendDuration,
  suspendExpiresAt,
  suspendReason,
  onUpdateStatus,
  onSuspendUser,
  onStatusChange,
  onNoteChange,
  onDurationChange,
  onExpiresChange,
  onReasonChange,
  formatTimestamp,
  t,
}: CommentDetailDialogProps) {
  const target = comment
    ? (() => {
        if (comment.homework?.id) {
          const sectionCode = comment.homework.section?.code ?? "";
          const homeworkTitle = comment.homework.title ?? "";
          return {
            href: `/comments/${comment.id}`,
            label:
              [sectionCode, homeworkTitle].filter(Boolean).join(" · ") || "—",
          };
        }
        if (comment.sectionTeacher?.section?.jwId) {
          const section = comment.sectionTeacher.section;
          return {
            href: `/sections/${section.jwId}#comment-${comment.id}`,
            label:
              section.course?.nameCn ??
              section.code ??
              comment.sectionTeacher.teacher?.nameCn ??
              "—",
          };
        }
        if (comment.section?.jwId) {
          return {
            href: `/sections/${comment.section.jwId}#comment-${comment.id}`,
            label:
              comment.section.course?.nameCn ?? comment.section.code ?? "—",
          };
        }
        if (comment.course?.jwId) {
          return {
            href: `/courses/${comment.course.jwId}#comment-${comment.id}`,
            label: comment.course.nameCn ?? "—",
          };
        }
        if (comment.teacher?.id) {
          return {
            href: `/teachers/${comment.teacher.id}#comment-${comment.id}`,
            label: comment.teacher.nameCn ?? "—",
          };
        }
        return null;
      })()
    : null;
  const adminUserHref = comment?.userId
    ? `/admin/users?search=${encodeURIComponent(comment.userId)}`
    : null;
  const authorLabel = comment
    ? (comment.user?.name ?? comment.authorName ?? t("guestLabel"))
    : "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="max-h-[70vh] max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("manageComment")}</DialogTitle>
          <DialogDescription>{t("clickToManage")}</DialogDescription>
        </DialogHeader>
        <DialogPanel>
          {comment && (
            <div className="space-y-6">
              <div className="rounded-md bg-muted/50 p-3">
                <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground text-xs">
                      {t("author")}
                    </dt>
                    <dd className="font-medium">{authorLabel}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs">
                      {t("postedIn")}
                    </dt>
                    <dd className="font-medium">{target?.label ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs">
                      {t("createdAt")}
                    </dt>
                    <dd className="font-medium">
                      {formatTimestamp(comment.createdAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs">ID</dt>
                    <dd className="font-mono text-xs">{comment.id}</dd>
                  </div>
                </dl>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {target ? (
                    <Button
                      size="sm"
                      variant="outline"
                      render={<Link href={target.href} />}
                    >
                      {t("openTarget")}
                    </Button>
                  ) : null}
                  {adminUserHref ? (
                    <Button
                      size="sm"
                      variant="outline"
                      render={<Link href={adminUserHref} />}
                    >
                      {t("manageUser")}
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-sm">{t("content")}</h4>
                <div className="rounded-md border bg-card p-3">
                  <p className="whitespace-pre-wrap text-sm">{comment.body}</p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">{t("changeStatus")}</h4>
                <RadioGroup
                  value={updateStatus}
                  onValueChange={(value) => {
                    if (
                      value === "active" ||
                      value === "softbanned" ||
                      value === "deleted"
                    ) {
                      onStatusChange(value);
                    }
                  }}
                  className="flex flex-wrap gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="active" id="status-active" />
                    <Label htmlFor="status-active">{t("statusActive")}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="softbanned" id="status-softbanned" />
                    <Label htmlFor="status-softbanned">
                      {t("statusSoftbanned")}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="deleted" id="status-deleted" />
                    <Label htmlFor="status-deleted">{t("statusDeleted")}</Label>
                  </div>
                </RadioGroup>

                <div className="space-y-2">
                  <Label>{t("noteLabel")}</Label>
                  <Textarea
                    value={updateNote}
                    onChange={(event) => onNoteChange(event.target.value)}
                    placeholder={t("moderationNote")}
                    rows={2}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={onUpdateStatus}
                    disabled={
                      updateStatus === comment.status &&
                      updateNote === (comment.moderationNote ?? "")
                    }
                  >
                    {t("confirmButton")}
                  </Button>
                </div>
              </div>

              {comment.userId && (
                <div className="space-y-3 border-t pt-4">
                  <h4 className="font-medium text-destructive">
                    {t("manageSuspension")}
                  </h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>{t("durationLabel")}</Label>
                      <Select
                        value={suspendDuration}
                        onValueChange={(value) =>
                          onDurationChange(value ?? "3d")
                        }
                        items={DURATION_OPTIONS.map((option) => ({
                          value: option.value,
                          label: t(option.labelKey),
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectPopup>
                          {DURATION_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {t(option.labelKey)}
                            </SelectItem>
                          ))}
                        </SelectPopup>
                      </Select>
                    </div>
                    {suspendDuration === "custom" && (
                      <div className="space-y-2">
                        <Label>{t("suspendExpires")}</Label>
                        <Input
                          type="datetime-local"
                          value={suspendExpiresAt}
                          onChange={(event) =>
                            onExpiresChange(event.target.value)
                          }
                        />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>{t("reason")}</Label>
                    <Input
                      value={suspendReason}
                      onChange={(event) => onReasonChange(event.target.value)}
                      placeholder={t("suspendReason")}
                    />
                  </div>
                  <Button variant="destructive" onClick={onSuspendUser}>
                    {t("suspendAction")}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogPanel>
      </DialogPopup>
    </Dialog>
  );
}

// LiftSuspensionDialog removed with Suspensions tab.
