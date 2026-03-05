"use client";

import { MagnifyingGlass } from "@phosphor-icons/react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  adminCommentsPaginatedResponseSchema,
  adminDescriptionsPaginatedResponseSchema,
  adminSuspensionsResponseSchema,
} from "@/lib/api/schemas";

type CommentStatus = "active" | "softbanned" | "deleted";
type CommentStatusFilter = CommentStatus | "all";
type CommentTargetTypeFilter =
  | "all"
  | "course"
  | "teacher"
  | "section"
  | "homework"
  | "sectionTeacher";
type DescriptionTargetTypeFilter =
  | "all"
  | "section"
  | "course"
  | "teacher"
  | "homework";

type AdminComment = {
  id: string;
  body: string;
  status: CommentStatus;
  isAnonymous: boolean;
  authorName: string | null;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
  moderationNote: string | null;
  user: { name: string | null } | null;
  section: { jwId: number | null; code: string | null } | null;
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
    section: { jwId: number | null; code: string | null } | null;
    teacher: { nameCn: string } | null;
  } | null;
};

type AdminDescription = {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  lastEditedAt: string | null;
  lastEditedById: string | null;
  sectionId: number | null;
  courseId: number | null;
  teacherId: number | null;
  homeworkId: string | null;
  lastEditedBy: { id: string; name: string | null } | null;
  section: { jwId: number; code: string } | null;
  course: { jwId: number; code: string; nameCn: string } | null;
  teacher: { id: number; nameCn: string } | null;
  homework: { id: string; title: string } | null;
};

type Suspension = {
  id: string;
  userId: string;
  createdAt: string;
  reason: string | null;
  note: string | null;
  expiresAt: string | null;
  liftedAt: string | null;
  user: { id: string; name: string | null } | null;
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
  targetTypeFilter: CommentTargetTypeFilter;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: CommentStatusFilter) => void;
  onTargetTypeChange: (value: CommentTargetTypeFilter) => void;
  t: ReturnType<typeof useTranslations>;
};

type DescriptionFiltersProps = {
  searchQuery: string;
  targetTypeFilter: DescriptionTargetTypeFilter;
  onSearchChange: (value: string) => void;
  onTargetTypeChange: (value: DescriptionTargetTypeFilter) => void;
  t: ReturnType<typeof useTranslations>;
};

type CommentsTableProps = {
  comments: AdminComment[];
  formatter: Intl.DateTimeFormat;
  onSelect: (comment: AdminComment) => void;
  getTargetLink: (comment: AdminComment) => { href: string; label: string };
  t: ReturnType<typeof useTranslations>;
};

type DescriptionsTableProps = {
  descriptions: AdminDescription[];
  formatter: Intl.DateTimeFormat;
  getTargetLink: (description: AdminDescription) => {
    href: string;
    label: string;
  };
  t: ReturnType<typeof useTranslations>;
};

type SuspensionsTableProps = {
  suspensions: Suspension[];
  formatter: Intl.DateTimeFormat;
  onLift: (suspensionId: string, userName: string) => void;
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
  formatter: Intl.DateTimeFormat;
  t: ReturnType<typeof useTranslations>;
};

type LiftDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  onConfirm: () => void;
  t: ReturnType<typeof useTranslations>;
};

export function ModerationDashboard() {
  const t = useTranslations("moderation");
  const locale = useLocale();
  const { toast } = useToast();
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [suspensions, setSuspensions] = useState<Suspension[]>([]);
  const [descriptions, setDescriptions] = useState<AdminDescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [descriptionsLoading, setDescriptionsLoading] = useState(false);
  const [statusFilter, setStatusFilter] =
    useState<CommentStatusFilter>("active");
  const [targetTypeFilter, setTargetTypeFilter] =
    useState<CommentTargetTypeFilter>("all");
  const [descTargetTypeFilter, setDescTargetTypeFilter] =
    useState<DescriptionTargetTypeFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [descSearchQuery, setDescSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalComments, setTotalComments] = useState(0);
  const [descCurrentPage, setDescCurrentPage] = useState(1);
  const [descTotalPages, setDescTotalPages] = useState(1);
  const [descTotal, setDescTotal] = useState(0);

  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedComment, setSelectedComment] = useState<AdminComment | null>(
    null,
  );
  const [updateStatus, setUpdateStatus] = useState<CommentStatus>("active");
  const [updateNote, setUpdateNote] = useState("");

  const [suspendDuration, setSuspendDuration] = useState("3d");
  const [suspendExpiresAt, setSuspendExpiresAt] = useState("");
  const [suspendReason, setSuspendReason] = useState("");

  const [liftDialogOpen, setLiftDialogOpen] = useState(false);
  const [liftSuspensionId, setLiftSuspensionId] = useState("");
  const [liftUserName, setLiftUserName] = useState("");

  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: "short",
        timeStyle: "short",
      }),
    [locale],
  );

  const loadComments = useCallback(async () => {
    setLoading(true);
    try {
      const commentResult = await apiClient.GET("/api/admin/comments", {
        params: {
          query: {
            ...(statusFilter !== "all" ? { status: statusFilter } : {}),
            ...(targetTypeFilter !== "all"
              ? { targetType: targetTypeFilter }
              : {}),
            page: String(currentPage),
          },
        },
      });

      if (commentResult.response.ok && commentResult.data) {
        const parsed = adminCommentsPaginatedResponseSchema.safeParse(
          commentResult.data,
        );
        if (parsed.success) {
          setComments(parsed.data.data);
          setTotalPages(parsed.data.pagination.totalPages);
          setTotalComments(parsed.data.pagination.total);
        }
      }
    } catch (error) {
      console.error("Failed to load comments", error);
      toast({
        title: t("updateFailed"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, targetTypeFilter, currentPage, t, toast]);

  const loadDescriptions = useCallback(async () => {
    setDescriptionsLoading(true);
    try {
      const result = await apiClient.GET("/api/admin/descriptions", {
        params: {
          query: {
            ...(descTargetTypeFilter !== "all"
              ? { targetType: descTargetTypeFilter }
              : {}),
            page: String(descCurrentPage),
          },
        },
      });

      if (result.response.ok && result.data) {
        const parsed = adminDescriptionsPaginatedResponseSchema.safeParse(
          result.data,
        );
        if (parsed.success) {
          setDescriptions(parsed.data.data as AdminDescription[]);
          setDescTotalPages(parsed.data.pagination.totalPages);
          setDescTotal(parsed.data.pagination.total);
        }
      }
    } catch (error) {
      console.error("Failed to load descriptions", error);
    } finally {
      setDescriptionsLoading(false);
    }
  }, [descTargetTypeFilter, descCurrentPage]);

  const loadSuspensions = useCallback(async () => {
    try {
      const suspensionResult = await apiClient.GET("/api/admin/suspensions");

      if (suspensionResult.response.ok && suspensionResult.data) {
        const parsed = adminSuspensionsResponseSchema.safeParse(
          suspensionResult.data,
        );
        if (parsed.success) {
          setSuspensions(parsed.data.suspensions);
        }
      }
    } catch (error) {
      console.error("Failed to load suspensions", error);
    }
  }, []);

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  useEffect(() => {
    void loadDescriptions();
  }, [loadDescriptions]);

  useEffect(() => {
    void loadSuspensions();
  }, [loadSuspensions]);

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
      label = `${comment.sectionTeacher.section.code} · ${comment.sectionTeacher.teacher?.nameCn ?? ""}`;
    } else if (comment.section?.jwId) {
      url = `/sections/${comment.section.jwId}`;
      label = comment.section.code ?? t("unknownTarget");
    } else if (comment.course?.jwId) {
      url = `/courses/${comment.course.jwId}`;
      label = comment.course.code ?? comment.course.nameCn;
    } else if (comment.teacher?.id) {
      url = `/teachers/${comment.teacher.id}`;
      label = comment.teacher.nameCn;
    }

    return {
      href: `${url}#comment-${comment.id}`,
      label,
    };
  };

  const getDescriptionTargetLink = (
    description: AdminDescription,
  ): { href: string; label: string } => {
    if (description.section) {
      return {
        href: `/sections/${description.section.jwId}`,
        label: description.section.code,
      };
    }
    if (description.course) {
      return {
        href: `/courses/${description.course.jwId}`,
        label: description.course.code || description.course.nameCn,
      };
    }
    if (description.teacher) {
      return {
        href: `/teachers/${description.teacher.id}`,
        label: description.teacher.nameCn,
      };
    }
    if (description.homework) {
      return {
        href: `/homeworks/${description.homework.id}`,
        label: description.homework.title,
      };
    }
    return { href: "/", label: t("unknownTarget") };
  };

  const openDetailDialog = (comment: AdminComment) => {
    setSelectedComment(comment);
    setUpdateStatus(comment.status);
    setUpdateNote(comment.moderationNote ?? "");
    setSuspendDuration("3d");
    setSuspendExpiresAt("");

    const targetLink = getTargetLink(comment);
    const date = formatter.format(new Date(comment.createdAt));
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

  const calculateExpiresAt = () => {
    if (suspendDuration === "permanent") return undefined;
    if (suspendDuration === "custom") return suspendExpiresAt || undefined;

    const now = new Date();
    switch (suspendDuration) {
      case "1d":
        now.setDate(now.getDate() + 1);
        break;
      case "3d":
        now.setDate(now.getDate() + 3);
        break;
      case "7d":
        now.setDate(now.getDate() + 7);
        break;
      case "30d":
        now.setDate(now.getDate() + 30);
        break;
      default:
        return undefined;
    }
    return now.toISOString();
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
      await loadComments();
      setDetailDialogOpen(false);
    } catch (error) {
      console.error("Failed to update comment", error);
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
      await loadComments();
      setDetailDialogOpen(false);
    } catch (error) {
      console.error("Failed to suspend user", error);
      toast({
        title: t("suspendFailed"),
        variant: "destructive",
      });
    }
  };

  const openLiftDialog = (suspensionId: string, userName: string) => {
    setLiftSuspensionId(suspensionId);
    setLiftUserName(userName);
    setLiftDialogOpen(true);
  };

  const confirmLift = async () => {
    try {
      const result = await apiClient.PATCH("/api/admin/suspensions/{id}", {
        params: {
          path: { id: liftSuspensionId },
        },
      });

      if (!result.response.ok) {
        const apiMessage = extractApiErrorMessage(result.error);
        throw new Error(apiMessage ?? "Failed to lift suspension");
      }
      toast({
        title: t("liftSuccess"),
        variant: "success",
      });
      setLiftDialogOpen(false);
      await loadSuspensions();
    } catch (error) {
      console.error("Failed to lift suspension", error);
      toast({
        title: t("liftFailed"),
        variant: "destructive",
      });
    }
  };

  const filteredComments = useMemo(() => {
    if (!searchQuery.trim()) return comments;
    const query = searchQuery.toLowerCase();
    return comments.filter(
      (c) =>
        c.body?.toLowerCase().includes(query) ||
        c.user?.name?.toLowerCase().includes(query) ||
        c.authorName?.toLowerCase().includes(query),
    );
  }, [comments, searchQuery]);

  const filteredSuspensions = useMemo(() => {
    if (!searchQuery.trim()) return suspensions;
    const query = searchQuery.toLowerCase();
    return suspensions.filter(
      (s) =>
        s.user?.name?.toLowerCase().includes(query) ||
        s.userId?.toLowerCase().includes(query) ||
        s.reason?.toLowerCase().includes(query),
    );
  }, [suspensions, searchQuery]);

  const filteredDescriptions = useMemo(() => {
    if (!descSearchQuery.trim()) return descriptions;
    const query = descSearchQuery.toLowerCase();
    return descriptions.filter(
      (d) =>
        d.content?.toLowerCase().includes(query) ||
        d.lastEditedBy?.name?.toLowerCase().includes(query) ||
        d.section?.code?.toLowerCase().includes(query) ||
        d.course?.nameCn?.toLowerCase().includes(query) ||
        d.teacher?.nameCn?.toLowerCase().includes(query) ||
        d.homework?.title?.toLowerCase().includes(query),
    );
  }, [descriptions, descSearchQuery]);

  return (
    <>
      <Tabs defaultValue="comments">
        <TabsList>
          <TabsTab value="comments">
            {t("commentsTab")} ({totalComments})
          </TabsTab>
          <TabsTab value="descriptions">
            {t("descriptionsTab")} ({descTotal})
          </TabsTab>
          <TabsTab value="suspensions">
            {t("suspensionsTab")} ({suspensions.length})
          </TabsTab>
        </TabsList>

        <TabsPanel value="comments">
          <CommentFilters
            searchQuery={searchQuery}
            statusFilter={statusFilter}
            targetTypeFilter={targetTypeFilter}
            onSearchChange={(value) => {
              setSearchQuery(value);
              setCurrentPage(1);
            }}
            onStatusChange={(value) => {
              setStatusFilter(value);
              setCurrentPage(1);
            }}
            onTargetTypeChange={(value) => {
              setTargetTypeFilter(value);
              setCurrentPage(1);
            }}
            t={t}
          />

          {loading ? (
            <p className="text-muted-foreground text-sm">{t("loading")}</p>
          ) : filteredComments.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("noResults")}</p>
          ) : (
            <>
              <p className="mb-3 text-muted-foreground text-sm">
                {t("showingResults", { count: filteredComments.length })}
                {totalComments > filteredComments.length && (
                  <span className="ml-1 text-muted-foreground">
                    ({t("totalResults", { count: totalComments })})
                  </span>
                )}
              </p>
              <CommentsTable
                comments={filteredComments}
                formatter={formatter}
                onSelect={openDetailDialog}
                getTargetLink={getTargetLink}
                t={t}
              />
              <ModerationPagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </>
          )}
        </TabsPanel>

        <TabsPanel value="descriptions">
          <DescriptionFilters
            searchQuery={descSearchQuery}
            targetTypeFilter={descTargetTypeFilter}
            onSearchChange={(value) => {
              setDescSearchQuery(value);
              setDescCurrentPage(1);
            }}
            onTargetTypeChange={(value) => {
              setDescTargetTypeFilter(value);
              setDescCurrentPage(1);
            }}
            t={t}
          />

          {descriptionsLoading ? (
            <p className="text-muted-foreground text-sm">{t("loading")}</p>
          ) : filteredDescriptions.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("noResults")}</p>
          ) : (
            <>
              <p className="mb-3 text-muted-foreground text-sm">
                {t("showingResults", { count: filteredDescriptions.length })}
                {descTotal > filteredDescriptions.length && (
                  <span className="ml-1 text-muted-foreground">
                    ({t("totalResults", { count: descTotal })})
                  </span>
                )}
              </p>
              <DescriptionsTable
                descriptions={filteredDescriptions}
                formatter={formatter}
                getTargetLink={getDescriptionTargetLink}
                t={t}
              />
              <ModerationPagination
                currentPage={descCurrentPage}
                totalPages={descTotalPages}
                onPageChange={setDescCurrentPage}
              />
            </>
          )}
        </TabsPanel>

        <TabsPanel value="suspensions">
          <SuspensionFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            t={t}
          />

          {loading ? (
            <p className="text-muted-foreground text-sm">{t("loading")}</p>
          ) : filteredSuspensions.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("noResults")}</p>
          ) : (
            <>
              <p className="mb-3 text-muted-foreground text-sm">
                {t("showingResults", { count: filteredSuspensions.length })}
              </p>
              <SuspensionsTable
                suspensions={filteredSuspensions}
                formatter={formatter}
                onLift={openLiftDialog}
                t={t}
              />
            </>
          )}
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
        formatter={formatter}
        t={t}
      />

      <LiftSuspensionDialog
        open={liftDialogOpen}
        onOpenChange={setLiftDialogOpen}
        userName={liftUserName}
        onConfirm={() => void confirmLift()}
        t={t}
      />
    </>
  );
}

function CommentFilters({
  searchQuery,
  statusFilter,
  targetTypeFilter,
  onSearchChange,
  onStatusChange,
  onTargetTypeChange,
  t,
}: CommentFiltersProps) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative flex-1">
        <MagnifyingGlass className="absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t("searchPlaceholder")}
          className="pl-9"
        />
      </div>
      <Select
        value={statusFilter}
        onValueChange={(value) => {
          const next: CommentStatusFilter =
            value === "all" ||
            value === "active" ||
            value === "softbanned" ||
            value === "deleted"
              ? value
              : "active";
          onStatusChange(next);
        }}
        items={[
          { value: "all", label: t("filterAll") },
          { value: "active", label: t("filterActive") },
          { value: "softbanned", label: t("filterSoftbanned") },
          { value: "deleted", label: t("filterDeleted") },
        ]}
      >
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectPopup>
          <SelectItem value="all">{t("filterAll")}</SelectItem>
          <SelectItem value="active">{t("filterActive")}</SelectItem>
          <SelectItem value="softbanned">{t("filterSoftbanned")}</SelectItem>
          <SelectItem value="deleted">{t("filterDeleted")}</SelectItem>
        </SelectPopup>
      </Select>
      <Select
        value={targetTypeFilter}
        onValueChange={(value) => {
          const validTypes = [
            "all",
            "course",
            "teacher",
            "section",
            "homework",
            "sectionTeacher",
          ] as const;
          const next: CommentTargetTypeFilter = validTypes.includes(
            value as (typeof validTypes)[number],
          )
            ? (value as CommentTargetTypeFilter)
            : "all";
          onTargetTypeChange(next);
        }}
        items={[
          { value: "all", label: t("targetTypeAll") },
          { value: "course", label: t("targetTypeCourse") },
          { value: "teacher", label: t("targetTypeTeacher") },
          { value: "section", label: t("targetTypeSection") },
          { value: "sectionTeacher", label: t("targetTypeSectionTeacher") },
          { value: "homework", label: t("targetTypeHomework") },
        ]}
      >
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectPopup>
          <SelectItem value="all">{t("targetTypeAll")}</SelectItem>
          <SelectItem value="course">{t("targetTypeCourse")}</SelectItem>
          <SelectItem value="teacher">{t("targetTypeTeacher")}</SelectItem>
          <SelectItem value="section">{t("targetTypeSection")}</SelectItem>
          <SelectItem value="sectionTeacher">
            {t("targetTypeSectionTeacher")}
          </SelectItem>
          <SelectItem value="homework">{t("targetTypeHomework")}</SelectItem>
        </SelectPopup>
      </Select>
    </div>
  );
}

function SuspensionFilters({
  searchQuery,
  onSearchChange,
  t,
}: {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <MagnifyingGlass className="absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t("searchSuspensionsPlaceholder")}
          className="pl-9"
        />
      </div>
    </div>
  );
}

function DescriptionFilters({
  searchQuery,
  targetTypeFilter,
  onSearchChange,
  onTargetTypeChange,
  t,
}: DescriptionFiltersProps) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative flex-1">
        <MagnifyingGlass className="absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t("searchDescriptionsPlaceholder")}
          className="pl-9"
        />
      </div>
      <Select
        value={targetTypeFilter}
        onValueChange={(value) => {
          const validTypes = [
            "all",
            "section",
            "course",
            "teacher",
            "homework",
          ] as const;
          const next: DescriptionTargetTypeFilter = validTypes.includes(
            value as (typeof validTypes)[number],
          )
            ? (value as DescriptionTargetTypeFilter)
            : "all";
          onTargetTypeChange(next);
        }}
        items={[
          { value: "all", label: t("targetTypeAll") },
          { value: "section", label: t("targetTypeSection") },
          { value: "course", label: t("targetTypeCourse") },
          { value: "teacher", label: t("targetTypeTeacher") },
          { value: "homework", label: t("targetTypeHomework") },
        ]}
      >
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectPopup>
          <SelectItem value="all">{t("targetTypeAll")}</SelectItem>
          <SelectItem value="section">{t("targetTypeSection")}</SelectItem>
          <SelectItem value="course">{t("targetTypeCourse")}</SelectItem>
          <SelectItem value="teacher">{t("targetTypeTeacher")}</SelectItem>
          <SelectItem value="homework">{t("targetTypeHomework")}</SelectItem>
        </SelectPopup>
      </Select>
    </div>
  );
}

function ModerationPagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  const maxVisible = 7;
  const half = Math.floor(maxVisible / 2);
  let start = Math.max(1, currentPage - half);
  const end = Math.min(totalPages, start + maxVisible - 1);
  start = Math.max(1, end - maxVisible + 1);
  const pages: number[] = [];
  for (let i = start; i <= end; i++) pages.push(i);
  return (
    <Pagination className="mt-4">
      <PaginationContent>
        {currentPage > 1 && (
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onPageChange(currentPage - 1);
              }}
            />
          </PaginationItem>
        )}
        {start > 1 && (
          <>
            <PaginationItem>
              <PaginationLink
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onPageChange(1);
                }}
              >
                1
              </PaginationLink>
            </PaginationItem>
            {start > 2 && <PaginationEllipsis />}
          </>
        )}
        {pages.map((pageNum) => (
          <PaginationItem key={pageNum}>
            <PaginationLink
              href="#"
              isActive={pageNum === currentPage}
              onClick={(e) => {
                e.preventDefault();
                onPageChange(pageNum);
              }}
            >
              {pageNum}
            </PaginationLink>
          </PaginationItem>
        ))}
        {end < totalPages && (
          <>
            {end < totalPages - 1 && <PaginationEllipsis />}
            <PaginationItem>
              <PaginationLink
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onPageChange(totalPages);
                }}
              >
                {totalPages}
              </PaginationLink>
            </PaginationItem>
          </>
        )}
        {currentPage < totalPages && (
          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onPageChange(currentPage + 1);
              }}
            />
          </PaginationItem>
        )}
      </PaginationContent>
    </Pagination>
  );
}

function CommentsTable({
  comments,
  formatter,
  onSelect,
  getTargetLink,
  t,
}: CommentsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("author")}</TableHead>
          <TableHead>{t("content")}</TableHead>
          <TableHead>{t("postedIn")}</TableHead>
          <TableHead>{t("status")}</TableHead>
          <TableHead>{t("lastEditedAt")}</TableHead>
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
          const editedAt = comment.updatedAt ?? comment.createdAt;

          return (
            <TableRow
              key={comment.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onSelect(comment)}
            >
              <TableCell className="font-medium">{authorName}</TableCell>
              <TableCell className="max-w-md">
                <p className="line-clamp-2 text-sm">{comment.body}</p>
              </TableCell>
              <TableCell>
                <Button
                  size="xs"
                  variant="link"
                  render={<Link className="no-underline" href={target.href} />}
                  onClick={(event) => event.stopPropagation()}
                >
                  {target.label}
                </Button>
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
              <TableCell className="text-muted-foreground text-xs">
                {formatter.format(new Date(editedAt))}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function SuspensionsTable({
  suspensions,
  formatter,
  onLift,
  t,
}: SuspensionsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("user")}</TableHead>
          <TableHead>{t("reason")}</TableHead>
          <TableHead>{t("createdAt")}</TableHead>
          <TableHead>{t("expires")}</TableHead>
          <TableHead>{t("status")}</TableHead>
          <TableHead>{t("actions")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {suspensions.map((suspension) => (
          <TableRow key={suspension.id}>
            <TableCell className="font-medium">
              {suspension.user?.name ?? suspension.userId}
            </TableCell>
            <TableCell>{suspension.reason ?? t("noReason")}</TableCell>
            <TableCell className="text-muted-foreground text-xs">
              {formatter.format(new Date(suspension.createdAt))}
            </TableCell>
            <TableCell className="text-muted-foreground text-xs">
              {suspension.expiresAt
                ? formatter.format(new Date(suspension.expiresAt))
                : t("permanent")}
            </TableCell>
            <TableCell>
              <Badge variant={suspension.liftedAt ? "outline" : "destructive"}>
                {suspension.liftedAt ? t("lifted") : t("active")}
              </Badge>
            </TableCell>
            <TableCell>
              {!suspension.liftedAt && (
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() =>
                    onLift(
                      suspension.id,
                      suspension.user?.name ?? suspension.userId,
                    )
                  }
                >
                  {t("liftAction")}
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function DescriptionsTable({
  descriptions,
  formatter,
  getTargetLink,
  t,
}: DescriptionsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("lastEditor")}</TableHead>
          <TableHead>{t("content")}</TableHead>
          <TableHead>{t("postedIn")}</TableHead>
          <TableHead>{t("lastEditedAt")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {descriptions.map((description) => {
          const editorName =
            description.lastEditedBy?.name ?? description.lastEditedById ?? "—";
          const target = getTargetLink(description);
          const editedAt =
            description.lastEditedAt ??
            description.updatedAt ??
            description.createdAt;

          return (
            <TableRow key={description.id}>
              <TableCell className="font-medium">{editorName}</TableCell>
              <TableCell className="max-w-md">
                <p className="line-clamp-2 text-sm">{description.content}</p>
              </TableCell>
              <TableCell>
                <Button
                  size="xs"
                  variant="link"
                  render={<Link className="no-underline" href={target.href} />}
                >
                  {target.label}
                </Button>
              </TableCell>
              <TableCell className="text-muted-foreground text-xs">
                {formatter.format(new Date(editedAt))}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
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
  formatter,
  t,
}: CommentDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("manageComment")}</DialogTitle>
          <DialogDescription>{t("clickToManage")}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto p-4">
          {comment && (
            <div className="space-y-6">
              <div className="rounded-md bg-muted/50 p-3">
                <p className="whitespace-pre-wrap text-sm">{comment.body}</p>
                <div className="mt-2 text-muted-foreground text-xs">
                  {t("author")}:{" "}
                  {comment.user?.name ?? comment.authorName ?? t("guestLabel")}{" "}
                  · {formatter.format(new Date(comment.createdAt))}
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
                  <DialogClose render={<Button variant="outline" />}>
                    {t("cancelButton")}
                  </DialogClose>
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
        </div>
      </DialogPopup>
    </Dialog>
  );
}

function LiftSuspensionDialog({
  open,
  onOpenChange,
  userName,
  onConfirm,
  t,
}: LiftDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup>
        <DialogHeader>
          <DialogTitle>{t("confirmLiftTitle")}</DialogTitle>
          <DialogDescription>
            {t("confirmLiftMessage", { userName })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            {t("cancelButton")}
          </DialogClose>
          <Button onClick={onConfirm}>{t("confirmButton")}</Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
