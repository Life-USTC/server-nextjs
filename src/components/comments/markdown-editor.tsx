"use client";

import type * as React from "react";
import { useState } from "react";
import { CommentMarkdown } from "@/components/comments/comment-markdown";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";

type MarkdownEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  tabWriteLabel: string;
  tabPreviewLabel: string;
  previewEmptyLabel: string;
  markdownGuideLabel: string;
  markdownGuideHref: string;
  disabled?: boolean;
  rows?: number;
  compact?: boolean;
  isDragActive?: boolean;
  onDragOver?: React.DragEventHandler<HTMLTextAreaElement>;
  onDragLeave?: React.DragEventHandler<HTMLTextAreaElement>;
  onDrop?: React.DragEventHandler<HTMLTextAreaElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLTextAreaElement>;
  textareaRef?: React.Ref<HTMLTextAreaElement>;
};

export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  tabWriteLabel,
  tabPreviewLabel,
  previewEmptyLabel,
  markdownGuideLabel,
  markdownGuideHref,
  disabled,
  rows,
  compact,
  isDragActive,
  onDragOver,
  onDragLeave,
  onDrop,
  onKeyDown,
  textareaRef,
}: MarkdownEditorProps) {
  const [activeTab, setActiveTab] = useState("write");
  const resolvedRows = rows ?? (compact ? 3 : 6);

  return (
    <div className="space-y-3">
      <Tabs
        value={activeTab}
        onValueChange={(next) => next && setActiveTab(next)}
        className="w-full"
      >
        <div className="flex items-end justify-between gap-2 mb-2">
          <TabsList className="h-8 p-0.5 bg-muted/50">
            <TabsTab value="write" className="h-7 px-3 text-xs">
              {tabWriteLabel}
            </TabsTab>
            <TabsTab value="preview" className="h-7 px-3 text-xs">
              {tabPreviewLabel}
            </TabsTab>
          </TabsList>

          <Button
            variant="ghost"
            size="xs"
            className="h-8 px-2"
            render={<Link href={markdownGuideHref} />}
          >
            <span className="text-xs text-muted-foreground">
              {markdownGuideLabel}
            </span>
          </Button>
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
              value={value}
              onChange={(event) => onChange(event.target.value)}
              placeholder={placeholder}
              rows={resolvedRows}
              disabled={disabled}
              unstyled
              className={cn(
                "w-full bg-transparent p-4 text-sm resize-none",
                isDragActive ? "bg-primary/5" : "",
              )}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onKeyDown={onKeyDown}
            />
          </div>
          <div className={cn("p-4", activeTab !== "preview" && "hidden")}>
            {value.trim() ? (
              <CommentMarkdown content={value} />
            ) : (
              <p className="text-xs text-muted-foreground italic text-center">
                {previewEmptyLabel}
              </p>
            )}
          </div>
        </div>
      </Tabs>
    </div>
  );
}
