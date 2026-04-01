"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetHeader,
  SheetPanel,
  SheetPopup,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { MarkdownEditor } from "@/features/comments/components/markdown-editor";
import { useToast } from "@/hooks/use-toast";
import { logClientError } from "@/lib/log/app-logger";
import { toShanghaiIsoString } from "@/lib/time/serialize-date-output";
import {
  parseShanghaiDateTimeLocalInput,
  toShanghaiDateTimeLocalValue,
} from "@/lib/time/shanghai-format";
import type { TodoItem } from "./todo-list";

type TodoFormSheetProps = {
  mode: "create" | "edit";
  todo?: TodoItem;
  onSaved?: () => void | Promise<void>;
  onDelete?: (id: string) => void;
  triggerChildren: ReactNode;
  triggerVariant?: "default" | "outline" | "ghost" | "secondary";
  triggerSize?: "default" | "sm" | "lg" | "icon";
  triggerAriaLabel?: string;
  triggerClassName?: string;
};

export function TodoFormSheet({
  mode,
  todo,
  onSaved,
  onDelete,
  triggerChildren,
  triggerVariant,
  triggerSize,
  triggerAriaLabel,
  triggerClassName,
}: TodoFormSheetProps) {
  const t = useTranslations("todos");
  const tComments = useTranslations("comments");
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState(todo?.title ?? "");
  const [content, setContent] = useState(todo?.content ?? "");
  const [priority, setPriority] = useState<"low" | "medium" | "high">(
    todo?.priority ?? "medium",
  );
  const [dueAt, setDueAt] = useState(toShanghaiDateTimeLocalValue(todo?.dueAt));

  useEffect(() => {
    if (open) {
      setTitle(todo?.title ?? "");
      setContent(todo?.content ?? "");
      setPriority(todo?.priority ?? "medium");
      setDueAt(toShanghaiDateTimeLocalValue(todo?.dueAt));
    }
  }, [open, todo]);

  const handleSave = async () => {
    const normalizedTitle = title.trim();
    if (!normalizedTitle) {
      toast({ title: t("errorTitleRequired"), variant: "destructive" });
      return;
    }
    if (normalizedTitle.length > 200) {
      toast({ title: t("errorTitleTooLong"), variant: "destructive" });
      return;
    }
    const normalizedContent = content.trim();
    if (normalizedContent.length > 4000) {
      toast({ title: t("errorContentTooLong"), variant: "destructive" });
      return;
    }

    const parsedDueAt = parseShanghaiDateTimeLocalInput(dueAt);
    if (parsedDueAt === undefined) {
      toast({ title: t("errorInvalidDueAt"), variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const body = {
        title: normalizedTitle,
        content: normalizedContent || null,
        priority,
        dueAt: parsedDueAt ? toShanghaiIsoString(parsedDueAt) : null,
      };

      const url =
        mode === "edit" && todo ? `/api/todos/${todo.id}` : "/api/todos";
      const method = mode === "edit" ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        toast({ title: t("saveFailed"), variant: "destructive" });
        return;
      }

      toast({
        title: mode === "create" ? t("createSuccess") : t("updateSuccess"),
        variant: "success",
      });
      setOpen(false);
      await onSaved?.();
    } catch (error) {
      logClientError("Failed to save todo", error, {
        component: "TodoFormSheet",
        mode,
        todoId: todo?.id ?? null,
      });
      toast({ title: t("saveFailed"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant={triggerVariant}
            size={triggerSize}
            aria-label={triggerAriaLabel}
            className={triggerClassName}
          />
        }
      >
        {triggerChildren}
      </SheetTrigger>
      <SheetPopup side="right">
        <SheetHeader>
          <SheetTitle>
            {mode === "create" ? t("createTitle") : t("editTitle")}
          </SheetTitle>
        </SheetHeader>
        <SheetPanel className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="todo-title">{t("titleLabel")}</Label>
            <Input
              id="todo-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("titlePlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="todo-priority">{t("priorityLabel")}</Label>
            <Select
              value={priority}
              onValueChange={(v) => setPriority(v as "low" | "medium" | "high")}
              items={[
                { value: "low", label: t("priority.low") },
                { value: "medium", label: t("priority.medium") },
                { value: "high", label: t("priority.high") },
              ]}
            >
              <SelectTrigger id="todo-priority">
                <SelectValue />
              </SelectTrigger>
              <SelectPopup>
                <SelectItem value="low">{t("priority.low")}</SelectItem>
                <SelectItem value="medium">{t("priority.medium")}</SelectItem>
                <SelectItem value="high">{t("priority.high")}</SelectItem>
              </SelectPopup>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="todo-due">{t("dueAtLabel")}</Label>
            <Input
              id="todo-due"
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("contentLabel")}</Label>
            <MarkdownEditor
              value={content}
              onChange={setContent}
              placeholder={t("contentPlaceholder")}
              tabWriteLabel={tComments("tabWrite")}
              tabPreviewLabel={tComments("tabPreview")}
              previewEmptyLabel={tComments("previewEmpty")}
              markdownGuideLabel={tComments("markdownGuide")}
              markdownGuideHref="/guides/markdown-support"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              {mode === "edit" && todo && onDelete ? (
                <Button
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => {
                    onDelete(todo.id);
                    setOpen(false);
                  }}
                  aria-label={t("deleteAriaLabel")}
                >
                  {t("delete")}
                </Button>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                {t("cancel")}
              </Button>
              <Button onClick={() => void handleSave()} disabled={saving}>
                {saving
                  ? t("saving")
                  : mode === "create"
                    ? t("createAction")
                    : t("saveChanges")}
              </Button>
            </div>
          </div>
        </SheetPanel>
      </SheetPopup>
    </Sheet>
  );
}
