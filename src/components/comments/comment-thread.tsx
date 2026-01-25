"use client";

import { Link2, Pencil, Reply } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { CommentAttachmentPicker } from "@/components/comments/comment-attachment-picker";
import { CommentEditor } from "@/components/comments/comment-editor";
import { CommentLinkCards } from "@/components/comments/comment-link-cards";
import { CommentMarkdown } from "@/components/comments/comment-markdown";
import { CommentReactions } from "@/components/comments/comment-reactions";
import type {
  CommentNode,
  CommentViewer,
} from "@/components/comments/comment-types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardPanel } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";

type UploadOption = {
  id: string;
  filename: string;
  size: number;
  url?: string;
};

type UploadSummary = {
  maxFileSizeBytes: number;
  quotaBytes: number;
  usedBytes: number;
};

type CommentThreadProps = {
  comments: CommentNode[];
  viewer: CommentViewer;
  uploads: UploadOption[];
  uploadSummary?: UploadSummary | null;
  onUploadComplete?: (upload: UploadOption, summary: UploadSummary) => void;
  onReply: (
    parentId: string,
    payload: {
      body: string;
      visibility: string;
      isAnonymous: boolean;
      attachmentIds: string[];
    },
  ) => Promise<void>;
  onEdit: (
    commentId: string,
    payload: { body: string; attachmentIds: string[] },
  ) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  highlightId?: string;
  contextLabel?: string;
};

type CommentItemProps = {
  comment: CommentNode & { contextLabel?: string };
  viewer: CommentViewer;
  uploads: UploadOption[];
  uploadSummary?: UploadSummary | null;
  onUploadComplete?: (upload: UploadOption, summary: UploadSummary) => void;
  onReply: CommentThreadProps["onReply"];
  onEdit: CommentThreadProps["onEdit"];
  onDelete: CommentThreadProps["onDelete"];
  depth?: number;
  highlightId?: string;
  contextLabel?: string;
};

function CommentItem({
  comment,
  viewer,
  uploads,
  uploadSummary,
  onUploadComplete,
  onReply,
  onEdit,
  onDelete,
  depth = 0,
  highlightId,
  contextLabel,
}: CommentItemProps) {
  const t = useTranslations("comments");
  const locale = useLocale();
  const { toast } = useToast();
  const [showReply, setShowReply] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(comment.body);
  const [editAttachments, setEditAttachments] = useState<string[]>(
    comment.attachments.map((attachment) => attachment.uploadId),
  );

  useEffect(() => {
    setEditValue(comment.body);
    setEditAttachments(
      comment.attachments.map((attachment) => attachment.uploadId),
    );
  }, [comment.attachments, comment.body]);

  const combinedUploads = useMemo(() => {
    const items = new Map<string, UploadOption>();
    for (const upload of uploads) {
      items.set(upload.id, upload);
    }
    for (const attachment of comment.attachments) {
      if (!items.has(attachment.uploadId)) {
        items.set(attachment.uploadId, {
          id: attachment.uploadId,
          filename: attachment.filename,
          size: attachment.size,
          url: attachment.url,
        });
      }
    }
    return Array.from(items.values());
  }, [comment.attachments, uploads]);

  const initialAttachmentIds = useMemo(
    () => comment.attachments.map((attachment) => attachment.uploadId),
    [comment.attachments],
  );

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [locale],
  );

  const editedAt = useMemo(() => {
    const created = new Date(comment.createdAt).getTime();
    const updated = new Date(comment.updatedAt).getTime();
    if (Number.isNaN(created) || Number.isNaN(updated)) return null;
    return updated - created > 1000 ? new Date(comment.updatedAt) : null;
  }, [comment.createdAt, comment.updatedAt]);

  const displayName = comment.author?.name ?? t("anonymousLabel");
  const initials = displayName
    ?.split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleReply = async (payload: {
    body: string;
    visibility: string;
    isAnonymous: boolean;
    attachmentIds: string[];
  }) => {
    await onReply(comment.id, payload);
    setShowReply(false);
  };

  const handleEdit = async () => {
    const trimmed = editValue.trim();
    const sortedInitial = [...initialAttachmentIds].sort();
    const sortedCurrent = [...editAttachments].sort();
    const sameAttachments =
      sortedInitial.length === sortedCurrent.length &&
      sortedInitial.every((value, index) => value === sortedCurrent[index]);
    if (trimmed === comment.body.trim() && sameAttachments) {
      setIsEditing(false);
      return;
    }
    try {
      await onEdit(comment.id, {
        body: trimmed,
        attachmentIds: editAttachments,
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update comment", error);
      toast({
        title: t("submitFailed"),
        description: t("pleaseRetry"),
        variant: "destructive",
      });
    }
  };

  const commentTone = "border-border/70 bg-background";

  const highlight = comment.id === highlightId;

  return (
    <div
      className={cn("space-y-3", depth > 0 && "pl-5")}
      style={{ marginLeft: depth > 0 ? "0.5rem" : undefined }}
    >
      <Card
        className={cn(
          "gap-4 border",
          commentTone,
          highlight && "ring-1 ring-primary/40",
        )}
      >
        <CardPanel className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <Avatar>
                {comment.author?.image ? (
                  <AvatarImage
                    src={comment.author.image}
                    alt={displayName ?? ""}
                  />
                ) : (
                  <AvatarFallback>{initials ?? "?"}</AvatarFallback>
                )}
              </Avatar>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">
                    {comment.authorHidden ? t("anonymousLabel") : displayName}
                  </span>
                  {(comment.contextLabel ?? contextLabel) && (
                    <Badge variant="outline">
                      {comment.contextLabel ?? contextLabel}
                    </Badge>
                  )}
                  {comment.author?.isUstcVerified && (
                    <Badge variant="secondary">{t("ustcVerified")}</Badge>
                  )}
                  {comment.isAuthor && comment.isAnonymous && (
                    <Badge variant="outline">{t("anonymousBadge")}</Badge>
                  )}
                  {comment.visibility === "logged_in_only" && (
                    <Badge variant="outline">{t("visibilityLoggedIn")}</Badge>
                  )}
                  {comment.status !== "active" && (
                    <Badge variant="outline">
                      {comment.status === "softbanned"
                        ? t("softbannedBadge")
                        : t("deletedBadge")}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {dateFormatter.format(new Date(comment.createdAt))}
                </p>
                {editedAt && (
                  <p className="text-xs text-muted-foreground">
                    {t("editedAt", {
                      date: dateFormatter.format(editedAt),
                    })}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {comment.canReply && (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setShowReply((value) => !value)}
                >
                  <Reply className="h-4 w-4" />
                  {t("replyAction")}
                </Button>
              )}
              {comment.canEdit && (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setIsEditing((value) => !value)}
                >
                  <Pencil className="h-4 w-4" />
                  {t("editAction")}
                </Button>
              )}
              {comment.isAuthor && comment.status === "active" && (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => void onDelete(comment.id)}
                >
                  {t("deleteAction")}
                </Button>
              )}
              <Button
                variant="ghost"
                size="xs"
                render={<Link href={`/comments/${comment.id}`} />}
              >
                <Link2 className="h-4 w-4" />
                {t("linkAction")}
              </Button>
            </div>
          </div>

          {isEditing ? (
            <div className="space-y-3">
              <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
                <Textarea
                  value={editValue}
                  onChange={(event) => setEditValue(event.target.value)}
                  rows={4}
                  onKeyDown={(event) => {
                    if (
                      (event.metaKey || event.ctrlKey) &&
                      event.key === "Enter"
                    ) {
                      event.preventDefault();
                      void handleEdit();
                    }
                  }}
                />
                <div className="min-h-[7.5rem] rounded-lg border bg-muted/30 p-3">
                  {editValue.trim() ? (
                    <CommentMarkdown content={editValue} />
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {t("previewEmpty")}
                    </p>
                  )}
                </div>
              </div>
              <CommentAttachmentPicker
                viewer={viewer}
                uploads={combinedUploads}
                selectedIds={editAttachments}
                onChange={setEditAttachments}
                uploadSummary={uploadSummary}
                onUploadComplete={onUploadComplete}
              />
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button onClick={handleEdit} className="w-full sm:w-auto">
                  {t("saveAction")}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setEditValue(comment.body);
                    setEditAttachments(initialAttachmentIds);
                    setIsEditing(false);
                  }}
                  className="w-full sm:w-auto"
                >
                  {t("cancelAction")}
                </Button>
              </div>
            </div>
          ) : comment.status === "deleted" ? (
            <p className="text-sm text-muted-foreground">
              {t("deletedMessage")}
            </p>
          ) : (
            <>
              <CommentMarkdown content={comment.body} />
              <CommentLinkCards content={comment.body} />
            </>
          )}

          {comment.attachments.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {comment.attachments.map((attachment) => (
                <Card key={attachment.id} className="gap-2 py-4">
                  <CardPanel className="space-y-1">
                    <p className="text-sm font-medium">{attachment.filename}</p>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() =>
                        window.open(
                          attachment.url,
                          "_blank",
                          "noopener,noreferrer",
                        )
                      }
                      disabled={!attachment.url}
                    >
                      {t("openAttachment")}
                    </Button>
                  </CardPanel>
                </Card>
              ))}
            </div>
          )}

          <CommentReactions
            commentId={comment.id}
            reactions={comment.reactions}
            viewer={viewer}
          />
        </CardPanel>
      </Card>

      {showReply && (
        <div className="rounded-2xl border border-dashed p-4">
          <CommentEditor
            viewer={viewer}
            uploads={uploads}
            uploadSummary={uploadSummary}
            onUploadComplete={onUploadComplete}
            submitLabel={t("postReply")}
            cancelLabel={t("cancelAction")}
            onCancel={() => setShowReply(false)}
            onSubmit={handleReply}
            placeholder={t("replyPlaceholder")}
            compact
          />
        </div>
      )}

      {comment.replies.length > 0 && (
        <div className="space-y-4">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              viewer={viewer}
              uploads={uploads}
              uploadSummary={uploadSummary}
              onUploadComplete={onUploadComplete}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              depth={depth + 1}
              highlightId={highlightId}
              contextLabel={contextLabel}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CommentThread({
  comments,
  viewer,
  uploads,
  uploadSummary,
  onUploadComplete,
  onReply,
  onEdit,
  onDelete,
  highlightId,
  contextLabel,
}: CommentThreadProps) {
  if (comments.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {comments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          viewer={viewer}
          uploads={uploads}
          uploadSummary={uploadSummary}
          onUploadComplete={onUploadComplete}
          onReply={onReply}
          onEdit={onEdit}
          onDelete={onDelete}
          highlightId={highlightId}
          contextLabel={contextLabel}
        />
      ))}
    </div>
  );
}
