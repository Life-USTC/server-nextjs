import type { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogPanel,
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
import { Textarea } from "@/components/ui/textarea";
import { SUSPENSION_DURATION_OPTIONS } from "@/features/admin/constants";
import { Link } from "@/i18n/routing";
import type { AdminComment, CommentStatus } from "./moderation-types";

type CommentDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  comment: AdminComment | null;
  updateStatus: CommentStatus;
  updateNote: string;
  suspendDuration: string;
  suspendExpiresAt: string;
  suspendReason: string;
  onUpdateStatus: () => void;
  onSuspendUser: () => void;
  onStatusChange: (value: CommentStatus) => void;
  onNoteChange: (value: string) => void;
  onDurationChange: (value: string) => void;
  onExpiresChange: (value: string) => void;
  onReasonChange: (value: string) => void;
  formatTimestamp: (value: string | Date) => string;
  t: ReturnType<typeof useTranslations>;
};

export function CommentDetailDialog({
  open,
  onOpenChange,
  comment,
  updateStatus,
  updateNote,
  suspendDuration,
  suspendExpiresAt,
  suspendReason,
  onUpdateStatus,
  onSuspendUser,
  onStatusChange,
  onNoteChange,
  onDurationChange,
  onExpiresChange,
  onReasonChange,
  formatTimestamp,
  t,
}: CommentDetailDialogProps) {
  const target = comment
    ? (() => {
        if (comment.homework?.id) {
          const sectionCode = comment.homework.section?.code ?? "";
          const homeworkTitle = comment.homework.title ?? "";
          return {
            href: `/comments/${comment.id}`,
            label:
              [sectionCode, homeworkTitle].filter(Boolean).join(" · ") || "—",
          };
        }
        if (comment.sectionTeacher?.section?.jwId) {
          const section = comment.sectionTeacher.section;
          return {
            href: `/sections/${section.jwId}#comment-${comment.id}`,
            label:
              section.course?.nameCn ??
              section.code ??
              comment.sectionTeacher.teacher?.nameCn ??
              "—",
          };
        }
        if (comment.section?.jwId) {
          return {
            href: `/sections/${comment.section.jwId}#comment-${comment.id}`,
            label:
              comment.section.course?.nameCn ?? comment.section.code ?? "—",
          };
        }
        if (comment.course?.jwId) {
          return {
            href: `/courses/${comment.course.jwId}#comment-${comment.id}`,
            label: comment.course.nameCn ?? "—",
          };
        }
        if (comment.teacher?.id) {
          return {
            href: `/teachers/${comment.teacher.id}#comment-${comment.id}`,
            label: comment.teacher.nameCn ?? "—",
          };
        }
        return null;
      })()
    : null;
  const adminUserHref = comment?.userId
    ? `/admin/users?search=${encodeURIComponent(comment.userId)}`
    : null;
  const authorLabel = comment
    ? (comment.user?.name ?? comment.authorName ?? t("guestLabel"))
    : "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="max-h-[70vh] max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("manageComment")}</DialogTitle>
          <DialogDescription>{t("clickToManage")}</DialogDescription>
        </DialogHeader>
        <DialogPanel>
          {comment && (
            <div className="space-y-6">
              <div className="rounded-md bg-muted/50 p-3">
                <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground text-xs">
                      {t("author")}
                    </dt>
                    <dd className="font-medium">{authorLabel}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs">
                      {t("postedIn")}
                    </dt>
                    <dd className="font-medium">{target?.label ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs">
                      {t("createdAt")}
                    </dt>
                    <dd className="font-medium">
                      {formatTimestamp(comment.createdAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs">ID</dt>
                    <dd className="font-mono text-xs">{comment.id}</dd>
                  </div>
                </dl>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {target ? (
                    <Button
                      size="sm"
                      variant="outline"
                      render={<Link href={target.href} />}
                    >
                      {t("openTarget")}
                    </Button>
                  ) : null}
                  {adminUserHref ? (
                    <Button
                      size="sm"
                      variant="outline"
                      render={<Link href={adminUserHref} />}
                    >
                      {t("manageUser")}
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-sm">{t("content")}</h4>
                <div className="rounded-md border bg-card p-3">
                  <p className="whitespace-pre-wrap text-sm">{comment.body}</p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">{t("changeStatus")}</h4>
                <RadioGroup
                  value={updateStatus}
                  onValueChange={(value) => {
                    if (
                      value === "active" ||
                      value === "softbanned" ||
                      value === "deleted"
                    ) {
                      onStatusChange(value);
                    }
                  }}
                  className="flex flex-wrap gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="active" id="status-active" />
                    <Label htmlFor="status-active">{t("statusActive")}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="softbanned" id="status-softbanned" />
                    <Label htmlFor="status-softbanned">
                      {t("statusSoftbanned")}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="deleted" id="status-deleted" />
                    <Label htmlFor="status-deleted">{t("statusDeleted")}</Label>
                  </div>
                </RadioGroup>

                <div className="space-y-2">
                  <Label>{t("noteLabel")}</Label>
                  <Textarea
                    value={updateNote}
                    onChange={(event) => onNoteChange(event.target.value)}
                    placeholder={t("moderationNote")}
                    rows={2}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={onUpdateStatus}
                    disabled={
                      updateStatus === comment.status &&
                      updateNote === (comment.moderationNote ?? "")
                    }
                  >
                    {t("confirmButton")}
                  </Button>
                </div>
              </div>

              {comment.userId && (
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
                          onDurationChange(value ?? "3d")
                        }
                        items={SUSPENSION_DURATION_OPTIONS.map((option) => ({
                          value: option.value,
                          label: t(option.labelKey),
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectPopup>
                          {SUSPENSION_DURATION_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {t(option.labelKey)}
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
                          onChange={(event) =>
                            onExpiresChange(event.target.value)
                          }
                        />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>{t("reason")}</Label>
                    <Input
                      value={suspendReason}
                      onChange={(event) => onReasonChange(event.target.value)}
                      placeholder={t("suspendReason")}
                    />
                  </div>
                  <Button variant="destructive" onClick={onSuspendUser}>
                    {t("suspendAction")}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogPanel>
      </DialogPopup>
    </Dialog>
  );
}
