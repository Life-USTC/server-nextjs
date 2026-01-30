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

type AdminComment = any;
type Suspension = any;

const DURATION_OPTIONS = [
  { value: "1d", labelKey: "duration1Day" },
  { value: "3d", labelKey: "duration3Days" },
  { value: "7d", labelKey: "duration1Week" },
  { value: "30d", labelKey: "duration1Month" },
  { value: "permanent", labelKey: "durationPermanent" },
  { value: "custom", labelKey: "durationCustom" },
] as const;

export function ModerationDashboard() {
  const t = useTranslations("moderation");
  const locale = useLocale();
  const { toast } = useToast();
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [suspensions, setSuspensions] = useState<Suspension[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [searchQuery, setSearchQuery] = useState("");

  // Detail Dialog State
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedComment, setSelectedComment] = useState<AdminComment | null>(
    null,
  );
  const [updateStatus, setUpdateStatus] = useState("");
  const [updateNote, setUpdateNote] = useState("");

  // Suspension State inside Detail Dialog
  const [suspendDuration, setSuspendDuration] = useState("3d");
  const [suspendExpiresAt, setSuspendExpiresAt] = useState("");
  const [suspendReason, setSuspendReason] = useState("");

  // Separate Lift Dialog (still needed for suspensions tab)
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

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }

      const [commentResponse, suspensionResponse] = await Promise.all([
        fetch(`/api/admin/comments?${params.toString()}`),
        fetch("/api/admin/suspensions"),
      ]);

      if (commentResponse.ok) {
        const data = await commentResponse.json();
        setComments(data.comments ?? []);
      }
      if (suspensionResponse.ok) {
        const data = await suspensionResponse.json();
        setSuspensions(data.suspensions ?? []);
      }
    } catch (error) {
      console.error("Failed to load moderation data", error);
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
      label = `${comment.sectionTeacher.section.code} · ${comment.sectionTeacher.teacher?.nameCn ?? ""}`;
    } else if (comment.section?.jwId) {
      url = `/sections/${comment.section.jwId}`;
      label = comment.section.code;
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

  const openDetailDialog = (comment: AdminComment) => {
    setSelectedComment(comment);
    setUpdateStatus(comment.status);
    setUpdateNote(comment.moderationNote ?? "");
    setSuspendDuration("3d");
    setSuspendExpiresAt("");

    // Set default ban reason
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
    if (suspendDuration === "permanent") return null;
    if (suspendDuration === "custom") return suspendExpiresAt || null;

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
        return null;
    }
    return now.toISOString();
  };

  const handleUpdateStatus = async () => {
    if (!selectedComment) return;
    try {
      const response = await fetch(
        `/api/admin/comments/${selectedComment.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: updateStatus,
            moderationNote: updateNote.trim() || null,
          }),
        },
      );
      if (!response.ok) {
        throw new Error("Failed to update comment");
      }
      toast({
        title: t("updateSuccess"),
        variant: "success",
      });
      await loadData();
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
      const response = await fetch("/api/admin/suspensions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedComment.userId,
          reason: suspendReason.trim() || null,
          expiresAt,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to suspend user");
      }
      toast({
        title: t("suspendSuccess"),
        variant: "success",
      });
      await loadData();
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
      const response = await fetch(
        `/api/admin/suspensions/${liftSuspensionId}`,
        {
          method: "PATCH",
        },
      );
      if (!response.ok) {
        throw new Error("Failed to lift suspension");
      }
      toast({
        title: t("liftSuccess"),
        variant: "success",
      });
      setLiftDialogOpen(false);
      await loadData();
    } catch (error) {
      console.error("Failed to lift suspension", error);
      toast({
        title: t("liftFailed"),
        variant: "destructive",
      });
    }
  };

  const filteredComments = useMemo(() => {
    let filtered = comments;
    if (statusFilter !== "all") {
      filtered = filtered.filter((c) => c.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.body?.toLowerCase().includes(query) ||
          c.user?.name?.toLowerCase().includes(query) ||
          c.authorName?.toLowerCase().includes(query),
      );
    }
    return filtered;
  }, [comments, statusFilter, searchQuery]);

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

  return (
    <>
      <Tabs defaultValue="comments">
        <TabsList>
          <TabsTab value="comments">
            {t("commentsTab")} ({comments.length})
          </TabsTab>
          <TabsTab value="suspensions">
            {t("suspensionsTab")} ({suspensions.length})
          </TabsTab>
        </TabsList>

        <TabsPanel value="comments">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <MagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="pl-9"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value ?? "active")}
              items={[
                { value: "all", label: t("filterAll") },
                { value: "active", label: t("filterActive") },
                { value: "softbanned", label: t("filterSoftbanned") },
                { value: "deleted", label: t("filterDeleted") },
              ]}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectPopup>
                <SelectItem value="all">{t("filterAll")}</SelectItem>
                <SelectItem value="active">{t("filterActive")}</SelectItem>
                <SelectItem value="softbanned">
                  {t("filterSoftbanned")}
                </SelectItem>
                <SelectItem value="deleted">{t("filterDeleted")}</SelectItem>
              </SelectPopup>
            </Select>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">{t("loading")}</p>
          ) : filteredComments.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noResults")}</p>
          ) : (
            <>
              <p className="mb-3 text-sm text-muted-foreground">
                {t("showingResults", { count: filteredComments.length })}
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("author")}</TableHead>
                    <TableHead>{t("content")}</TableHead>
                    <TableHead>{t("postedIn")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                    <TableHead>{t("createdAt")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredComments.map((comment) => {
                    const authorName =
                      comment.user?.name ??
                      comment.authorName ??
                      t("guestLabel");
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
                        onClick={() => openDetailDialog(comment)}
                      >
                        <TableCell className="font-medium">
                          {authorName}
                        </TableCell>
                        <TableCell className="max-w-md">
                          <p className="line-clamp-2 text-sm">{comment.body}</p>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="xs"
                            variant="link"
                            render={<Link href={target.href} />}
                            onClick={(e) => e.stopPropagation()}
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
                        <TableCell className="text-xs text-muted-foreground">
                          {formatter.format(new Date(comment.createdAt))}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </>
          )}
        </TabsPanel>

        <TabsPanel value="suspensions">
          <div className="mb-4">
            <div className="relative">
              <MagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="pl-9"
              />
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">{t("loading")}</p>
          ) : filteredSuspensions.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noResults")}</p>
          ) : (
            <>
              <p className="mb-3 text-sm text-muted-foreground">
                {t("showingResults", { count: filteredSuspensions.length })}
              </p>
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
                  {filteredSuspensions.map((suspension) => (
                    <TableRow key={suspension.id}>
                      <TableCell className="font-medium">
                        {suspension.user?.name ?? suspension.userId}
                      </TableCell>
                      <TableCell>
                        {suspension.reason ?? t("noReason")}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatter.format(new Date(suspension.createdAt))}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {suspension.expiresAt
                          ? formatter.format(new Date(suspension.expiresAt))
                          : t("permanent")}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            suspension.liftedAt ? "outline" : "destructive"
                          }
                        >
                          {suspension.liftedAt ? t("lifted") : t("active")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {!suspension.liftedAt && (
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() =>
                              openLiftDialog(
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
            </>
          )}
        </TabsPanel>
      </Tabs>

      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogPopup className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{t("manageComment")}</DialogTitle>
            <DialogDescription>{t("clickToManage")}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto p-4">
            {selectedComment && (
              <div className="space-y-6">
                <div className="rounded-md bg-muted/50 p-3">
                  <p className="whitespace-pre-wrap text-sm">
                    {selectedComment.body}
                  </p>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {t("author")}:{" "}
                    {selectedComment.user?.name ??
                      selectedComment.authorName ??
                      t("guestLabel")}{" "}
                    · {formatter.format(new Date(selectedComment.createdAt))}
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">{t("changeStatus")}</h4>
                  <RadioGroup
                    value={updateStatus}
                    onValueChange={setUpdateStatus}
                    className="flex flex-wrap gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="active" id="status-active" />
                      <Label htmlFor="status-active">{t("statusActive")}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value="softbanned"
                        id="status-softbanned"
                      />
                      <Label htmlFor="status-softbanned">
                        {t("statusSoftbanned")}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="deleted" id="status-deleted" />
                      <Label htmlFor="status-deleted">
                        {t("statusDeleted")}
                      </Label>
                    </div>
                  </RadioGroup>

                  <div className="space-y-2">
                    <Label>{t("noteLabel")}</Label>
                    <Textarea
                      value={updateNote}
                      onChange={(e) => setUpdateNote(e.target.value)}
                      placeholder={t("moderationNote")}
                      rows={2}
                    />
                  </div>
                  <Button
                    onClick={handleUpdateStatus}
                    disabled={
                      updateStatus === selectedComment.status &&
                      updateNote === (selectedComment.moderationNote ?? "")
                    }
                  >
                    {t("confirmButton")}
                  </Button>
                </div>

                {selectedComment.userId && (
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
                            setSuspendDuration(value ?? "3d")
                          }
                          items={DURATION_OPTIONS.map((opt) => ({
                            value: opt.value,
                            label: t(opt.labelKey),
                          }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectPopup>
                            {DURATION_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {t(opt.labelKey)}
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
                            onChange={(e) =>
                              setSuspendExpiresAt(e.target.value)
                            }
                          />
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>{t("reason")}</Label>
                      <Input
                        value={suspendReason}
                        onChange={(e) => setSuspendReason(e.target.value)}
                        placeholder={t("suspendReason")}
                      />
                    </div>
                    <Button variant="destructive" onClick={handleSuspendUser}>
                      {t("suspendAction")}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogPopup>
      </Dialog>

      <Dialog open={liftDialogOpen} onOpenChange={setLiftDialogOpen}>
        <DialogPopup>
          <DialogHeader>
            <DialogTitle>{t("confirmLiftTitle")}</DialogTitle>
            <DialogDescription>
              {t("confirmLiftMessage", { userName: liftUserName })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              {t("cancelButton")}
            </DialogClose>
            <Button onClick={() => void confirmLift()}>
              {t("confirmButton")}
            </Button>
          </DialogFooter>
        </DialogPopup>
      </Dialog>
    </>
  );
}
