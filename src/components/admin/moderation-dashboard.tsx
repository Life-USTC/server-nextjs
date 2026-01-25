"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardPanel } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "@/i18n/routing";

type AdminComment = any;
type Suspension = any;

export function ModerationDashboard() {
  const t = useTranslations("moderation");
  const locale = useLocale();
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [suspensions, setSuspensions] = useState<Suspension[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [suspensionUserId, setSuspensionUserId] = useState("");
  const [suspensionReason, setSuspensionReason] = useState("");
  const [suspensionExpiresAt, setSuspensionExpiresAt] = useState("");

  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [locale],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [commentResponse, suspensionResponse] = await Promise.all([
        fetch("/api/admin/comments"),
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
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const updateStatus = async (commentId: string, status: string) => {
    const note = notes[commentId] ?? "";
    try {
      const response = await fetch(`/api/admin/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, moderationNote: note.trim() || null }),
      });
      if (!response.ok) {
        throw new Error("Failed to update comment");
      }
      await loadData();
    } catch (error) {
      console.error("Failed to update comment", error);
    }
  };

  const createSuspension = async () => {
    if (!suspensionUserId.trim()) return;
    try {
      const response = await fetch("/api/admin/suspensions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: suspensionUserId.trim(),
          reason: suspensionReason.trim() || null,
          expiresAt: suspensionExpiresAt || null,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to suspend user");
      }
      setSuspensionUserId("");
      setSuspensionReason("");
      setSuspensionExpiresAt("");
      await loadData();
    } catch (error) {
      console.error("Failed to suspend user", error);
    }
  };

  const liftSuspension = async (suspensionId: string) => {
    try {
      const response = await fetch(`/api/admin/suspensions/${suspensionId}`, {
        method: "PATCH",
      });
      if (!response.ok) {
        throw new Error("Failed to lift suspension");
      }
      await loadData();
    } catch (error) {
      console.error("Failed to lift suspension", error);
    }
  };

  const getTargetLink = (comment: AdminComment) => {
    if (comment.sectionTeacher?.section?.jwId) {
      return {
        href: `/sections/${comment.sectionTeacher.section.jwId}`,
        label: `${comment.sectionTeacher.section.code} · ${comment.sectionTeacher.teacher?.nameCn ?? ""}`,
      };
    }
    if (comment.section?.jwId) {
      return {
        href: `/sections/${comment.section.jwId}`,
        label: comment.section.code,
      };
    }
    if (comment.course?.jwId) {
      return {
        href: `/courses/${comment.course.jwId}`,
        label: comment.course.code ?? comment.course.nameCn,
      };
    }
    if (comment.teacher?.id) {
      return {
        href: `/teachers/${comment.teacher.id}`,
        label: comment.teacher.nameCn,
      };
    }
    return { href: "/", label: t("unknownTarget") };
  };

  return (
    <Tabs defaultValue="comments">
      <TabsList>
        <TabsTab value="comments">{t("commentsTab")}</TabsTab>
        <TabsTab value="suspensions">{t("suspensionsTab")}</TabsTab>
      </TabsList>

      <TabsPanel value="comments">
        <div className="space-y-4">
          {loading && (
            <p className="text-sm text-muted-foreground">{t("loading")}</p>
          )}
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
            const createdAt = new Date(comment.createdAt);
            const updatedAt = new Date(comment.updatedAt);
            const editedAt =
              updatedAt.getTime() - createdAt.getTime() > 1000
                ? updatedAt
                : null;
            return (
              <Card key={comment.id} className="gap-4">
                <CardPanel className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">
                          {authorName}
                        </span>
                        <Badge variant="outline">{statusLabel}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatter.format(new Date(comment.createdAt))}
                      </p>
                      {editedAt && (
                        <p className="text-xs text-muted-foreground">
                          {t("editedAt", {
                            date: formatter.format(editedAt),
                          })}
                        </p>
                      )}
                      {comment.moderatedAt && comment.moderatedBy && (
                        <p className="text-xs text-muted-foreground">
                          {t("moderatedAt", {
                            date: formatter.format(
                              new Date(comment.moderatedAt),
                            ),
                            name: comment.moderatedBy.name ?? "",
                          })}
                        </p>
                      )}
                    </div>
                    <Button
                      size="xs"
                      variant="outline"
                      render={<Link href={target.href} />}
                    >
                      {t("openTarget")}
                    </Button>
                  </div>

                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {comment.body}
                  </p>

                  <Textarea
                    value={notes[comment.id] ?? comment.moderationNote ?? ""}
                    onChange={(event) =>
                      setNotes((current) => ({
                        ...current,
                        [comment.id]: event.target.value,
                      }))
                    }
                    placeholder={t("moderationNote")}
                    rows={2}
                  />

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void updateStatus(comment.id, "softbanned")
                      }
                      disabled={comment.status === "softbanned"}
                    >
                      {t("softban")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void updateStatus(comment.id, "active")}
                      disabled={comment.status === "active"}
                    >
                      {t("restore")}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => void updateStatus(comment.id, "deleted")}
                      disabled={comment.status === "deleted"}
                    >
                      {t("delete")}
                    </Button>
                    {comment.userId && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setSuspensionUserId(comment.userId)}
                      >
                        {t("suspendUser")}
                      </Button>
                    )}
                  </div>
                </CardPanel>
              </Card>
            );
          })}
        </div>
      </TabsPanel>

      <TabsPanel value="suspensions">
        <div className="space-y-6">
          <Card>
            <CardPanel className="space-y-3">
              <h3 className="text-base font-semibold">{t("suspendTitle")}</h3>
              <Input
                value={suspensionUserId}
                onChange={(event) => setSuspensionUserId(event.target.value)}
                placeholder={t("suspendUserId")}
              />
              <Input
                value={suspensionReason}
                onChange={(event) => setSuspensionReason(event.target.value)}
                placeholder={t("suspendReason")}
              />
              <Input
                type="datetime-local"
                value={suspensionExpiresAt}
                onChange={(event) => setSuspensionExpiresAt(event.target.value)}
                placeholder={t("suspendExpires")}
              />
              <Button onClick={() => void createSuspension()}>
                {t("suspendAction")}
              </Button>
            </CardPanel>
          </Card>

          <div className="space-y-4">
            {suspensions.map((suspension) => (
              <Card key={suspension.id} className="gap-3">
                <CardPanel className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">
                        {suspension.user?.name ?? suspension.userId}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {suspension.reason ?? t("noReason")}
                      </p>
                    </div>
                    <Badge
                      variant={suspension.liftedAt ? "outline" : "secondary"}
                    >
                      {suspension.liftedAt ? t("lifted") : t("active")}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("suspendedAt", {
                      date: formatter.format(new Date(suspension.createdAt)),
                    })}
                  </p>
                  {!suspension.liftedAt && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void liftSuspension(suspension.id)}
                    >
                      {t("liftAction")}
                    </Button>
                  )}
                </CardPanel>
              </Card>
            ))}
          </div>
        </div>
      </TabsPanel>
    </Tabs>
  );
}
