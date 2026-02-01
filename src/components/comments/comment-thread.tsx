"use client";

import { DotsThree, Trash, Warning } from "@phosphor-icons/react";
import { Link2, Pencil, Reply } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/menu";
import type { UploadOption, UploadSummary } from "@/hooks/use-comment-upload";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { useToast } from "@/hooks/use-toast";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";

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
    payload: {
      body: string;
      attachmentIds: string[];
      visibility?: string;
      isAnonymous?: boolean;
    },
  ) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  onReact: (commentId: string, type: string, remove: boolean) => Promise<void>;
  highlightId?: string | null;
};

export function CommentThread({
  comments,
  viewer,
  uploads,
  uploadSummary,
  onUploadComplete,
  onReply,
  onEdit,
  onDelete,
  onReact,
  highlightId: initialHighlightId,
}: CommentThreadProps) {
  const [highlightedId, setHighlightedId] = useState<string | null>(
    initialHighlightId ?? null,
  );

  useEffect(() => {
    if (initialHighlightId) {
      setHighlightedId(initialHighlightId);
      const element = document.getElementById(`comment-${initialHighlightId}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
      const timer = setTimeout(() => setHighlightedId(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [initialHighlightId]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll and highlight on hash change
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash) {
        const id = window.location.hash.substring(1);
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
          if (id.startsWith("comment-")) {
            const commentId = id.replace("comment-", "");
            setHighlightedId(commentId);
            setTimeout(() => setHighlightedId(null), 2000);
          }
        }
      }
    };

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [comments.length]);

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
          onReact={onReact}
          highlightId={highlightedId}
        />
      ))}
    </div>
  );
}

type CommentItemProps = {
  comment: CommentNode;
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
    payload: {
      body: string;
      attachmentIds: string[];
      visibility?: string;
      isAnonymous?: boolean;
    },
  ) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  onReact: (commentId: string, type: string, remove: boolean) => Promise<void>;
  depth?: number;
  highlightId?: string | null;
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
  onReact,
  depth = 0,
  highlightId,
}: CommentItemProps) {
  const t = useTranslations("comments");
  const locale = useLocale();
  const { toast } = useToast();
  const { copyToClipboard } = useCopyToClipboard();
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const initialAttachmentIds = comment.attachments?.map((a) => a.id) ?? [];

  const handleCopyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}#comment-${comment.id}`;
    void copyToClipboard(url);
    toast({
      description: t("linkCopied"),
    });
  };

  const combinedUploads = useMemo(() => {
    const items = new Map<string, UploadOption>();
    for (const upload of uploads) {
      items.set(upload.id, upload);
    }
    for (const attachment of comment.attachments) {
      if (!items.has(attachment.id)) {
        items.set(attachment.id, {
          id: attachment.id,
          filename: attachment.filename,
          size: attachment.size,
          url: attachment.url,
        });
      }
    }
    return Array.from(items.values());
  }, [comment.attachments, uploads]);

  const authorName =
    comment.author?.name ??
    (comment.isAnonymous ? t("anonymousLabel") : t("guestBadge"));

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [locale],
  );

  const isHighlighted = highlightId === comment.id;

  return (
    <div
      className={cn("space-y-3", depth > 0 && "pl-5")}
      style={{ marginLeft: depth > 0 ? "0.5rem" : undefined }}
    >
      <Card
        id={`comment-${comment.id}`}
        className={cn(
          "group gap-2 border bg-background transition-colors duration-500",
          isHighlighted && "ring-1 ring-primary/40",
        )}
      >
        <CardPanel className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <Avatar>
                {comment.author?.image ? (
                  <AvatarImage
                    src={comment.author.image}
                    alt={authorName ?? ""}
                  />
                ) : (
                  <AvatarFallback>{authorName.slice(0, 2)}</AvatarFallback>
                )}
              </Avatar>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-sm">{authorName}</span>
                  {comment.author?.isUstcVerified && (
                    <Badge variant="secondary" className="text-[0.65rem]">
                      {t("ustcVerified")}
                    </Badge>
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
                <Link
                  href={`#comment-${comment.id}`}
                  className="block text-muted-foreground text-xs hover:underline"
                >
                  {dateFormatter.format(new Date(comment.createdAt))}
                </Link>
                {comment.updatedAt !== comment.createdAt && (
                  <p className="text-muted-foreground text-xs">
                    {t("editedAt", {
                      date: dateFormatter.format(new Date(comment.updatedAt)),
                    })}
                  </p>
                )}
              </div>
            </div>
            <div className="pointer-events-none flex flex-wrap gap-2 opacity-0 transition-opacity group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100">
              {comment.canReply && (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setIsReplying((value) => !value)}
                >
                  <Reply className="mr-1 h-4 w-4" />
                  {t("replyAction")}
                </Button>
              )}
              {comment.canEdit && (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setIsEditing((value) => !value)}
                >
                  <Pencil className="mr-1 h-4 w-4" />
                  {t("editAction")}
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="ghost" size="xs" className="h-6 w-6 p-0">
                      <DotsThree className="h-4 w-4" />
                    </Button>
                  }
                />
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleCopyLink}>
                    <Link2 className="mr-2 h-4 w-4" />
                    {t("copyLinkAction")}
                  </DropdownMenuItem>
                  {(comment.canModerate || comment.isAuthor) && (
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => void onDelete(comment.id)}
                    >
                      <Trash className="mr-2 h-4 w-4" />
                      {t("deleteAction")}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem>
                    <Warning className="mr-2 h-4 w-4" />
                    {t("reportAction")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {isEditing ? (
            <CommentEditor
              viewer={viewer}
              uploads={combinedUploads}
              uploadSummary={uploadSummary}
              onUploadComplete={onUploadComplete}
              initialBody={comment.body}
              initialAttachments={initialAttachmentIds}
              initialVisibility={comment.visibility}
              initialIsAnonymous={comment.isAnonymous}
              compact
              submitLabel={t("saveAction")}
              cancelLabel={t("cancelAction")}
              onSubmit={async (payload) => {
                await onEdit(comment.id, {
                  body: payload.body,
                  attachmentIds: payload.attachmentIds,
                  visibility: payload.visibility,
                  isAnonymous: payload.isAnonymous,
                });
                setIsEditing(false);
              }}
              onCancel={() => setIsEditing(false)}
            />
          ) : comment.status === "deleted" ? (
            <p className="text-muted-foreground text-sm">
              {t("deletedMessage")}
            </p>
          ) : (
            <div className="space-y-2">
              <CommentMarkdown content={comment.body} />
              <CommentLinkCards content={comment.body} />
            </div>
          )}

          {comment.attachments.length > 0 && !isEditing && (
            <div className="grid gap-2 sm:grid-cols-2">
              {comment.attachments.map((attachment) => (
                <Card key={attachment.id} className="gap-2 py-4">
                  <CardPanel className="space-y-1">
                    <p className="font-medium text-sm">{attachment.filename}</p>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() =>
                        window.open(
                          `/api/uploads/${attachment.id}/download`,
                          "_blank",
                          "noopener,noreferrer",
                        )
                      }
                      disabled={!attachment.url && !attachment.id}
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

      {isReplying && (
        <div className="rounded-2xl border border-dashed p-4">
          <CommentEditor
            viewer={viewer}
            uploads={uploads}
            uploadSummary={uploadSummary}
            onUploadComplete={onUploadComplete}
            submitLabel={t("replyAction")}
            cancelLabel={t("cancelAction")}
            onCancel={() => setIsReplying(false)}
            onSubmit={async (payload) => {
              await onReply(comment.id, payload);
              setIsReplying(false);
            }}
            compact
            placeholder={t("replyPlaceholder")}
          />
        </div>
      )}

      {comment.replies && comment.replies.length > 0 && (
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
              onReact={onReact}
              depth={depth + 1}
              highlightId={highlightId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
