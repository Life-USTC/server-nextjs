"use client";

import { UploadCloud, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useRef, useState } from "react";
import { CommentMarkdown } from "@/components/comments/comment-markdown";
import type { CommentViewer } from "@/components/comments/comment-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useCommentUpload } from "@/hooks/use-comment-upload";
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
  initialBody?: string;
  initialAttachments?: string[];
  initialVisibility?: string;
  initialIsAnonymous?: boolean;
  targetOptions?: Array<{ value: string; label: string }>;
  targetValue?: string;
  onTargetChange?: (value: string) => void;
  hideVisibility?: boolean;
};

export function CommentEditor({
  viewer,
  uploads: _uploads,
  onSubmit,
  uploadSummary,
  onUploadComplete,
  submitLabel,
  cancelLabel,
  onCancel,
  placeholder,
  compact,
  initialBody = "",
  initialAttachments = [],
  initialVisibility = "public",
  initialIsAnonymous = false,
  targetOptions,
  targetValue,
  onTargetChange,
  hideVisibility,
}: CommentEditorProps) {
  const t = useTranslations("comments");
  const tu = useTranslations("uploads");
  const { toast } = useToast();
  const [content, setContent] = useState(initialBody);
  const [visibility, setVisibility] = useState(
    initialVisibility === "anonymous" ? "public" : initialVisibility,
  );
  const [isAnonymous, setIsAnonymous] = useState(
    initialIsAnonymous || initialVisibility === "anonymous",
  );
  const [selectedAttachments, setSelectedAttachments] =
    useState<string[]>(initialAttachments);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [targetDialogOpen, setTargetDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("write");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const anonymousId = useId();
  const loggedInId = useId();

  const { uploadFile, isUploading } = useCommentUpload({
    uploadSummary,
    onUploadComplete,
  });

  const insertMarkdown = (text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setContent((prev) => prev + text);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = content.substring(0, start);
    const after = content.substring(end);
    const newContent = before + text + after;
    setContent(newContent);
    // Restore cursor and focus
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + text.length;
      textarea.focus();
    }, 0);
  };

  const handleUpload = async (file: File) => {
    // Insert placeholder
    const placeholderText = `![Uploading ${file.name}...]()`;
    insertMarkdown(placeholderText);

    // Find where we inserted it to replace later
    const token = `![Uploading ${file.name}...](${Date.now()})`;
    setContent((prev) => prev.replace(placeholderText, token));

    const uploaded = await uploadFile(file);

    if (uploaded) {
      setSelectedAttachments((prev) => [...prev, uploaded.id]);
      const isImage = file.type.startsWith("image/");
      const downloadUrl = `/api/uploads/${uploaded.id}/download`;
      const markdown = isImage
        ? `![${uploaded.filename}](${downloadUrl})`
        : `[${uploaded.filename}](${downloadUrl})`;

      setContent((prev) => prev.replace(token, markdown));
    } else {
      // Upload failed, remove placeholder
      setContent((prev) => prev.replace(token, ""));
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDrop = async (event: React.DragEvent<HTMLTextAreaElement>) => {
    event.preventDefault();
    setIsDragActive(false);

    if (!viewer.isAuthenticated || viewer.isSuspended) return;

    const files = event.dataTransfer.files;
    if (files.length === 0) return;

    void handleUpload(files[0]);
  };

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

  const currentTarget = targetOptions?.find((opt) => opt.value === targetValue);
  const currentTargetLabel = currentTarget?.label;

  const getVisibilityDescription = () => {
    if (!currentTarget) return null;
    return t("commentTargetCurrent", { label: currentTargetLabel ?? "" });
  };

  return (
    <div className="space-y-4">
      {targetOptions && targetOptions.length > 1 && (
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs">
          <span className="text-muted-foreground">
            {getVisibilityDescription()}
          </span>
          <Button
            variant="link"
            size="xs"
            className="h-auto p-0 text-primary"
            onClick={() => setTargetDialogOpen(true)}
          >
            {t("changeTarget")}
          </Button>
        </div>
      )}

      <div className="space-y-3">
        <Tabs
          value={activeTab}
          onValueChange={(v) => v && setActiveTab(v)}
          className="w-full"
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <TabsList className="h-8 p-0.5 bg-muted/50">
              <TabsTab value="write" className="h-7 px-3 text-xs">
                {t("tabWrite")}
              </TabsTab>
              <TabsTab value="preview" className="h-7 px-3 text-xs">
                {t("tabPreview")}
              </TabsTab>
            </TabsList>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="xs"
                className="h-8 px-2"
                onClick={() => fileInputRef.current?.click()}
                disabled={
                  !viewer.isAuthenticated || viewer.isSuspended || isUploading
                }
              >
                <UploadCloud className="h-3.5 w-3.5 mr-1.5" />
                <span className="text-xs">
                  {isUploading ? tu("uploading") : tu("uploadAction")}
                </span>
              </Button>
              <Button
                variant="ghost"
                size="xs"
                className="h-8 px-2"
                render={<Link href="/comments/guide" />}
              >
                <span className="text-xs text-muted-foreground">
                  {t("markdownGuide")}
                </span>
              </Button>
            </div>
          </div>

          <div
            className={cn(
              "rounded-xl border bg-muted/10 transition-shadow min-h-[8rem]",
              activeTab === "write" &&
                "focus-within:border-primary/50 focus-within:ring-[3px] focus-within:ring-primary/10",
            )}
          >
            <div
              className={cn("flex flex-col", activeTab !== "write" && "hidden")}
            >
              <Textarea
                ref={textareaRef}
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder={placeholder ?? t("editorPlaceholder")}
                rows={compact ? 3 : 6}
                disabled={!viewer.isAuthenticated || viewer.isSuspended}
                unstyled
                className={cn(
                  "w-full bg-transparent p-4 text-sm resize-none",
                  isDragActive ? "bg-primary/5" : "",
                )}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragActive(true);
                }}
                onDragLeave={() => setIsDragActive(false)}
                onDrop={handleDrop}
                onKeyDown={(event) => {
                  if (
                    (event.metaKey || event.ctrlKey) &&
                    event.key === "Enter" &&
                    viewer.isAuthenticated &&
                    !viewer.isSuspended
                  ) {
                    event.preventDefault();
                    void handleSubmit();
                  }
                }}
              />
            </div>
            <div className={cn("p-4", activeTab !== "preview" && "hidden")}>
              {content.trim() ? (
                <CommentMarkdown content={content} />
              ) : (
                <p className="text-xs text-muted-foreground italic text-center">
                  {t("previewEmpty")}
                </p>
              )}
            </div>
          </div>
        </Tabs>

        <Input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleUpload(file);
          }}
        />
      </div>

      {selectedAttachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedAttachments.map((id) => {
            const upload = _uploads.find((u) => u.id === id);
            return (
              <Badge key={id} variant="secondary" className="gap-1 px-2 py-1">
                <span className="max-w-[150px] truncate text-[10px]">
                  {upload?.filename ?? id}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedAttachments((prev) =>
                      prev.filter((i) => i !== id),
                    )
                  }
                  className="rounded-full hover:bg-muted p-0.5"
                >
                  <XIcon className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-4">
          {!hideVisibility && (
            <div className="flex items-center gap-4">
              <label
                htmlFor={anonymousId}
                className="flex items-center gap-2 cursor-pointer select-none"
              >
                <Checkbox
                  id={anonymousId}
                  checked={isAnonymous}
                  disabled={!viewer.isAuthenticated || viewer.isSuspended}
                  onCheckedChange={(checked) =>
                    setIsAnonymous(checked === true)
                  }
                />
                <span className="text-xs text-muted-foreground">
                  {t("visibilityAnonymous")}
                </span>
              </label>
              <label
                htmlFor={loggedInId}
                className="flex items-center gap-2 cursor-pointer select-none"
              >
                <Checkbox
                  id={loggedInId}
                  checked={visibility === "logged_in_only"}
                  disabled={!viewer.isAuthenticated || viewer.isSuspended}
                  onCheckedChange={(checked) => {
                    if (checked) setVisibility("logged_in_only");
                    else setVisibility("public");
                  }}
                />
                <span className="text-xs text-muted-foreground">
                  {t("visibilityLoggedIn")}
                </span>
              </label>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {onCancel && cancelLabel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="h-9 px-4 text-xs"
            >
              {cancelLabel}
            </Button>
          )}
          {!viewer.isAuthenticated ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                window.location.href = "/signin";
              }}
              className="h-9 px-4 text-xs"
            >
              {t("loginToComment")}
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={
                isSubmitting ||
                viewer.isSuspended ||
                isUploading ||
                !content.trim()
              }
              className="h-9 px-6 text-xs font-semibold"
            >
              {isSubmitting ? t("posting") : submitLabel}
            </Button>
          )}
        </div>
      </div>

      <Dialog open={targetDialogOpen} onOpenChange={setTargetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("changeTargetTitle")}</DialogTitle>
            <DialogDescription>
              {t("changeTargetDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select
              value={targetValue}
              onValueChange={(value) => {
                if (value) {
                  onTargetChange?.(value);
                  setTargetDialogOpen(false);
                }
              }}
              items={targetOptions}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("commentTargetPlaceholder")} />
              </SelectTrigger>
              <SelectPopup>
                {targetOptions?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="ghost" />}>
              {t("cancelAction")}
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
