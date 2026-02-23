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
        <div className="mb-2 flex items-end justify-between gap-2">
          <TabsList className="h-8 bg-muted/50 p-0.5">
            <TabsTab value="write" className="h-7 px-3 text-xs">
              {tabWriteLabel}
            </TabsTab>
            <TabsTab value="preview" className="h-7 px-3 text-xs">
              {tabPreviewLabel}
            </TabsTab>
          </TabsList>
        </div>

        <div
          className={cn(
            "min-h-[8rem] rounded-xl border bg-muted/10 transition-shadow",
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
              aria-label={placeholder}
              placeholder={placeholder}
              rows={resolvedRows}
              disabled={disabled}
              unstyled
              className={cn(
                "w-full resize-none bg-transparent p-4 text-sm",
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
              <p className="text-center text-muted-foreground text-xs italic">
                {previewEmptyLabel}
              </p>
            )}
          </div>
        </div>

        <div className="mt-2 flex justify-end">
          <Button
            variant="ghost"
            size="xs"
            className="h-8 px-2 text-muted-foreground"
            render={<Link className="no-underline" href={markdownGuideHref} />}
          >
            <span className="text-xs">{markdownGuideLabel}</span>
          </Button>
        </div>
      </Tabs>
    </div>
  );
}
