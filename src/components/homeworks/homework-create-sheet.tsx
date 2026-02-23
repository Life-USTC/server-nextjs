"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { MarkdownEditor } from "@/components/comments/markdown-editor";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetHeader,
  SheetPanel,
  SheetPopup,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiClient, extractApiErrorMessage } from "@/lib/api-client";

type TranslateFn = (
  key: string,
  values?: Record<string, string | number | Date>,
) => string;

export type HomeworkCreateSectionOption = {
  id: number;
  label: string;
  semesterStart: string | null;
  semesterEnd: string | null;
};

type HomeworkCreateSheetProps = {
  canCreate: boolean;
  t: TranslateFn;
  tComments: TranslateFn;
  triggerRender: React.ReactElement;
  triggerChildren: ReactNode;
  sectionOptions?: HomeworkCreateSectionOption[];
  sectionLabel?: string;
  sectionPlaceholder?: string;
  defaultSectionId?: number | null;
  fixedSectionId?: number;
  fixedSemesterEnd?: string | null;
  idPrefix: string;
  createButtonTestId?: string;
  onCreated?: () => void | Promise<void>;
};

export function HomeworkCreateSheet({
  canCreate,
  t,
  tComments,
  triggerRender,
  triggerChildren,
  sectionOptions,
  sectionLabel,
  sectionPlaceholder,
  defaultSectionId,
  fixedSectionId,
  fixedSemesterEnd,
  idPrefix,
  createButtonTestId,
  onCreated,
}: HomeworkCreateSheetProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(
    defaultSectionId ?? sectionOptions?.[0]?.id ?? null,
  );

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [publishedAt, setPublishedAt] = useState("");
  const [submissionStartAt, setSubmissionStartAt] = useState("");
  const [submissionDueAt, setSubmissionDueAt] = useState("");
  const [isMajor, setIsMajor] = useState(false);
  const [requiresTeam, setRequiresTeam] = useState(false);

  const sectionId = fixedSectionId ?? selectedSectionId;
  const selectedSection = useMemo(() => {
    if (!sectionOptions?.length || !selectedSectionId) return null;
    return (
      sectionOptions.find((option) => option.id === selectedSectionId) ?? null
    );
  }, [sectionOptions, selectedSectionId]);

  const semesterEndDate = useMemo(() => {
    const value = fixedSectionId
      ? fixedSemesterEnd
      : selectedSection?.semesterEnd;
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }, [fixedSectionId, fixedSemesterEnd, selectedSection?.semesterEnd]);

  useEffect(() => {
    if (!open) return;
    if (!publishedAt) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setPublishedAt(toLocalInputValue(today.toISOString()));
    }
    if (!submissionStartAt) {
      setSubmissionStartAt(toLocalInputValue(new Date().toISOString()));
    }
  }, [open, publishedAt, submissionStartAt]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setPublishedAt(toLocalInputValue(today.toISOString()));
    setSubmissionStartAt(toLocalInputValue(new Date().toISOString()));
    setSubmissionDueAt("");
    setIsMajor(false);
    setRequiresTeam(false);
    setAdvancedOpen(false);
  };

  const parseLocalDateInput = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? undefined : date;
  };

  const endOfDay = (date: Date) => {
    const copy = new Date(date);
    copy.setHours(23, 59, 0, 0);
    return copy;
  };

  const applyStartNow = () => {
    setSubmissionStartAt(toLocalInputValue(new Date().toISOString()));
  };

  const applyDueInAWeek = () => {
    const now = new Date();
    now.setDate(now.getDate() + 7);
    setSubmissionDueAt(toLocalInputValue(endOfDay(now).toISOString()));
  };

  const applyDueInAMonth = () => {
    const now = new Date();
    now.setMonth(now.getMonth() + 1);
    setSubmissionDueAt(toLocalInputValue(endOfDay(now).toISOString()));
  };

  const applySemesterEnd = () => {
    if (!semesterEndDate) return;
    setSubmissionDueAt(
      toLocalInputValue(endOfDay(semesterEndDate).toISOString()),
    );
  };

  const resolveHomeworkError = (error: string | null) => {
    if (!error) return t("errorGeneric");
    switch (error) {
      case "Invalid section":
      case "Section not found":
        return t("errorSectionNotFound");
      case "Unauthorized":
        return t("errorUnauthorized");
      case "Suspended":
        return t("errorSuspended");
      default:
        return t("errorGeneric");
    }
  };

  const renderStartHelperActions = () => (
    <div className="flex flex-wrap justify-end gap-2">
      <Button
        size="sm"
        variant="ghost"
        className="text-muted-foreground"
        onClick={applyStartNow}
      >
        {t("helperStartNow")}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="text-muted-foreground"
        onClick={() => setSubmissionStartAt("")}
      >
        {t("helperClear")}
      </Button>
    </div>
  );

  const renderDueHelperActions = () => (
    <div className="flex flex-wrap justify-end gap-2">
      <Button
        size="sm"
        variant="ghost"
        className="text-muted-foreground"
        onClick={applyDueInAWeek}
      >
        {t("helperWeek")}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="text-muted-foreground"
        onClick={applyDueInAMonth}
      >
        {t("helperMonth")}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="text-muted-foreground"
        onClick={applySemesterEnd}
        disabled={!semesterEndDate}
      >
        {t("helperSemesterEnd")}
      </Button>
    </div>
  );

  const handleCreate = async () => {
    if (!sectionId) {
      toast({
        title: t("createFailed"),
        description: t("sectionRequired"),
        variant: "destructive",
      });
      return;
    }

    const normalizedTitle = title.trim();
    if (!normalizedTitle) {
      toast({ title: t("titleRequired"), variant: "destructive" });
      return;
    }
    if (normalizedTitle.length > 200) {
      toast({
        title: t("createFailed"),
        description: t("errorTitleTooLong"),
        variant: "destructive",
      });
      return;
    }

    const normalizedDescription = description.trim();
    if (normalizedDescription.length > 4000) {
      toast({
        title: t("createFailed"),
        description: t("errorDescriptionTooLong"),
        variant: "destructive",
      });
      return;
    }

    const parsedPublishedAt = parseLocalDateInput(publishedAt);
    if (parsedPublishedAt === undefined) {
      toast({
        title: t("createFailed"),
        description: t("errorInvalidPublishDate"),
        variant: "destructive",
      });
      return;
    }

    const parsedSubmissionStartAt = parseLocalDateInput(submissionStartAt);
    if (parsedSubmissionStartAt === undefined) {
      toast({
        title: t("createFailed"),
        description: t("errorInvalidSubmissionStart"),
        variant: "destructive",
      });
      return;
    }

    const parsedSubmissionDueAt = parseLocalDateInput(submissionDueAt);
    if (parsedSubmissionDueAt === undefined) {
      toast({
        title: t("createFailed"),
        description: t("errorInvalidSubmissionDue"),
        variant: "destructive",
      });
      return;
    }

    if (
      parsedSubmissionStartAt &&
      parsedSubmissionDueAt &&
      parsedSubmissionStartAt.getTime() > parsedSubmissionDueAt.getTime()
    ) {
      toast({
        title: t("createFailed"),
        description: t("errorSubmissionRange"),
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const result = await apiClient.POST("/api/homeworks", {
        body: {
          sectionId: String(sectionId),
          title: normalizedTitle,
          description: normalizedDescription,
          publishedAt: parsedPublishedAt
            ? parsedPublishedAt.toISOString()
            : null,
          submissionStartAt: parsedSubmissionStartAt
            ? parsedSubmissionStartAt.toISOString()
            : null,
          submissionDueAt: parsedSubmissionDueAt
            ? parsedSubmissionDueAt.toISOString()
            : null,
          isMajor,
          requiresTeam,
        },
      });

      if (!result.response.ok) {
        toast({
          title: t("createFailed"),
          description: resolveHomeworkError(
            extractApiErrorMessage(result.error),
          ),
          variant: "destructive",
        });
        return;
      }

      toast({ title: t("createSuccess"), variant: "success" });
      resetForm();
      setOpen(false);
      await onCreated?.();
    } catch (error) {
      console.error("Failed to create homework", error);
      toast({ title: t("createFailed"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={triggerRender}>{triggerChildren}</SheetTrigger>
      <SheetPopup side="right">
        <SheetHeader>
          <SheetTitle>{t("createTitle")}</SheetTitle>
        </SheetHeader>
        <SheetPanel className="space-y-5">
          {sectionOptions ? (
            <div className="space-y-2">
              <Label htmlFor={`${idPrefix}-section`}>
                {sectionLabel ?? t("sectionLabel")}
              </Label>
              <Select
                value={selectedSectionId ? String(selectedSectionId) : ""}
                onValueChange={(value) =>
                  setSelectedSectionId(value ? Number(value) : null)
                }
                items={sectionOptions.map((option) => ({
                  value: String(option.id),
                  label: option.label,
                }))}
              >
                <SelectTrigger id={`${idPrefix}-section`}>
                  <SelectValue
                    placeholder={sectionPlaceholder ?? t("sectionPlaceholder")}
                  />
                </SelectTrigger>
                <SelectPopup>
                  {sectionOptions.map((option) => (
                    <SelectItem key={option.id} value={String(option.id)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-title`}>{t("titleLabel")}</Label>
            <Input
              id={`${idPrefix}-title`}
              data-testid={`${idPrefix}-title`}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t("titlePlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("descriptionLabel")}</Label>
            <MarkdownEditor
              value={description}
              onChange={setDescription}
              placeholder={t("descriptionPlaceholder")}
              tabWriteLabel={tComments("tabWrite")}
              tabPreviewLabel={tComments("tabPreview")}
              previewEmptyLabel={tComments("previewEmpty")}
              markdownGuideLabel={tComments("markdownGuide")}
              markdownGuideHref="/comments/guide"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-due`}>{t("submissionDue")}</Label>
            <Input
              id={`${idPrefix}-due`}
              type="datetime-local"
              value={submissionDueAt}
              onChange={(event) => setSubmissionDueAt(event.target.value)}
            />
            {renderDueHelperActions()}
          </div>

          <Separator />

          <Collapsible
            open={advancedOpen}
            onOpenChange={setAdvancedOpen}
            className="space-y-4"
          >
            <CollapsibleTrigger
              render={<Button variant="outline" className="w-full" />}
            >
              {advancedOpen ? t("advancedHide") : t("advancedShow")}
            </CollapsibleTrigger>
            <CollapsiblePanel className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`${idPrefix}-published`}>
                    {t("publishedAt")}
                  </Label>
                  <Input
                    id={`${idPrefix}-published`}
                    type="datetime-local"
                    value={publishedAt}
                    onChange={(event) => setPublishedAt(event.target.value)}
                  />
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground"
                      onClick={() =>
                        setPublishedAt(
                          toLocalInputValue(new Date().toISOString()),
                        )
                      }
                    >
                      {t("helperPublishNow")}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground"
                      onClick={() => setPublishedAt("")}
                    >
                      {t("helperClear")}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${idPrefix}-start`}>
                    {t("submissionStart")}
                  </Label>
                  <Input
                    id={`${idPrefix}-start`}
                    type="datetime-local"
                    value={submissionStartAt}
                    onChange={(event) =>
                      setSubmissionStartAt(event.target.value)
                    }
                  />
                  {renderStartHelperActions()}
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    id={`${idPrefix}-major`}
                    checked={isMajor}
                    onCheckedChange={setIsMajor}
                  />
                  <Label htmlFor={`${idPrefix}-major`}>{t("tagMajor")}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id={`${idPrefix}-team`}
                    checked={requiresTeam}
                    onCheckedChange={setRequiresTeam}
                  />
                  <Label htmlFor={`${idPrefix}-team`}>{t("tagTeam")}</Label>
                </div>
              </div>
            </CollapsiblePanel>
          </Collapsible>

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                resetForm();
                setOpen(false);
              }}
            >
              {t("cancel")}
            </Button>
            <Button
              data-testid={createButtonTestId}
              onClick={() => void handleCreate()}
              disabled={saving || !canCreate || !sectionId}
            >
              {saving ? t("saving") : t("createAction")}
            </Button>
          </div>
        </SheetPanel>
      </SheetPopup>
    </Sheet>
  );
}

function toLocalInputValue(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}
