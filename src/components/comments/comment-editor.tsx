"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { CommentAttachmentPicker } from "@/components/comments/comment-attachment-picker";
import { CommentMarkdown } from "@/components/comments/comment-markdown";
import type { CommentViewer } from "@/components/comments/comment-types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Link } from "@/i18n/routing";

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

type CommentEditorProps = {
  viewer: CommentViewer;
  uploads: UploadOption[];
  onSubmit: (payload: {
    body: string;
    visibility: string;
    isAnonymous: boolean;
    attachmentIds: string[];
  }) => Promise<void>;
  uploadSummary?: UploadSummary | null;
  onUploadComplete?: (upload: UploadOption, summary: UploadSummary) => void;
  submitLabel: string;
  cancelLabel?: string;
  onCancel?: () => void;
  placeholder?: string;
  compact?: boolean;
  initialVisibility?: string;
  visibilityStyle?: "select" | "checkboxes";
  targetOptions?: Array<{ value: string; label: string }>;
  targetValue?: string;
  onTargetChange?: (value: string) => void;
};

const VISIBILITY_OPTIONS = [
  { value: "public", labelKey: "visibilityPublic" },
  { value: "anonymous", labelKey: "visibilityAnonymous" },
  { value: "logged_in_only", labelKey: "visibilityLoggedIn" },
] as const;

export function CommentEditor({
  viewer,
  uploads,
  onSubmit,
  uploadSummary,
  onUploadComplete,
  submitLabel,
  cancelLabel,
  onCancel,
  placeholder,
  compact,
  initialVisibility = "public",
  visibilityStyle = "select",
  targetOptions,
  targetValue,
  onTargetChange,
}: CommentEditorProps) {
  const t = useTranslations("comments");
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState(initialVisibility);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [selectedAttachments, setSelectedAttachments] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast({
        title: t("contentRequired"),
        description: t("contentRequiredDescription"),
        variant: "warning",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        body: content.trim(),
        visibility,
        isAnonymous,
        attachmentIds: selectedAttachments,
      });
      setContent("");
      setSelectedAttachments([]);
    } catch (error) {
      console.error("Comment submit failed", error);
      toast({
        title: t("submitFailed"),
        description: t("pleaseRetry"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Avatar className="mt-1 self-start">
          {viewer.image ? (
            <AvatarImage src={viewer.image} alt={viewer.name ?? ""} />
          ) : (
            <AvatarFallback>
              {(viewer.name ?? t("guestBadge")).slice(0, 2)}
            </AvatarFallback>
          )}
        </Avatar>
        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold">
              {viewer.name ?? t("guestBadge")}
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
            <Textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder={placeholder ?? t("editorPlaceholder")}
              rows={compact ? 3 : 5}
              disabled={!viewer.isAuthenticated}
              onKeyDown={(event) => {
                if (
                  (event.metaKey || event.ctrlKey) &&
                  event.key === "Enter" &&
                  viewer.isAuthenticated
                ) {
                  event.preventDefault();
                  void handleSubmit();
                }
              }}
            />
            <div className="min-h-[7.5rem] rounded-lg border bg-muted/30 p-3">
              <p className="mb-2 text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground">
                {t("previewLabel")}
              </p>
              {content.trim() ? (
                <CommentMarkdown content={content} />
              ) : (
                <p className="text-xs text-muted-foreground">
                  {t("previewEmpty")}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
        {visibilityStyle === "checkboxes" ? (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={isAnonymous}
                disabled={!viewer.isAuthenticated}
                onCheckedChange={(checked) => {
                  setIsAnonymous(checked === true);
                }}
                aria-label={t("visibilityAnonymous")}
              />
              <span>{t("visibilityAnonymous")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={visibility === "logged_in_only"}
                disabled={!viewer.isAuthenticated}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setVisibility("logged_in_only");
                  } else if (visibility === "logged_in_only") {
                    setVisibility("public");
                  }
                }}
                aria-label={t("visibilityLoggedIn")}
              />
              <span>{t("visibilityLoggedIn")}</span>
            </div>
          </div>
        ) : (
          <Select
            value={visibility}
            onValueChange={(value) => setVisibility(value ?? "public")}
            items={VISIBILITY_OPTIONS.map((option) => ({
              label: t(option.labelKey),
              value: option.value,
            }))}
          >
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue placeholder={t("visibilityLabel")} />
            </SelectTrigger>
            <SelectPopup>
              {VISIBILITY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        )}
        {targetOptions && targetOptions.length > 0 && (
          <Select
            value={targetValue ?? targetOptions[0].value}
            onValueChange={(value) => {
              if (value) {
                onTargetChange?.(value);
              }
            }}
            items={targetOptions}
          >
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder={t("commentTargetPlaceholder")} />
            </SelectTrigger>
            <SelectPopup>
              {targetOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        )}
        {!viewer.isAuthenticated ? (
          <Button
            variant="outline"
            onClick={() => {
              window.location.href = "/signin";
            }}
            className="w-full sm:w-auto"
          >
            {t("loginToComment")}
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? t("posting") : submitLabel}
          </Button>
        )}
        {onCancel && cancelLabel && (
          <Button
            variant="ghost"
            onClick={onCancel}
            className="w-full sm:w-auto"
          >
            {cancelLabel}
          </Button>
        )}
      </div>

      <div className="flex justify-end">
        <Button
          variant="link"
          size="xs"
          render={<Link href="/comments/guide" />}
        >
          {t("markdownGuide")}
        </Button>
      </div>

      <CommentAttachmentPicker
        viewer={viewer}
        uploads={uploads}
        selectedIds={selectedAttachments}
        onChange={setSelectedAttachments}
        uploadSummary={uploadSummary}
        onUploadComplete={onUploadComplete}
      />
    </div>
  );
}
