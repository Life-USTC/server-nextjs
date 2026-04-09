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
import { Link } from "@/i18n/routing";
import type { AdminDescription } from "./moderation-types";

type DescriptionDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  description: AdminDescription | null;
  formatTimestamp: (value: string | Date) => string;
  t: ReturnType<typeof useTranslations>;
};

export function DescriptionDetailDialog({
  open,
  onOpenChange,
  description,
  formatTimestamp,
  t,
}: DescriptionDetailDialogProps) {
  const adminUserHref = description?.lastEditedBy?.id
    ? `/admin/users?search=${encodeURIComponent(description.lastEditedBy.id)}`
    : null;
  const target = description?.homework?.id
    ? {
        href: `/homeworks/${description.homework.id}`,
        label: description.homework.title ?? "—",
      }
    : description?.section?.jwId
      ? {
          href: `/sections/${description.section.jwId}`,
          label: description.section.course?.nameCn ?? "—",
        }
      : description?.course?.jwId
        ? {
            href: `/courses/${description.course.jwId}`,
            label: description.course.nameCn ?? "—",
          }
        : description?.teacher?.id
          ? {
              href: `/teachers/${description.teacher.id}`,
              label: description.teacher.nameCn,
            }
          : { href: "/", label: "—" };

  const authorName = description?.lastEditedBy?.name ?? "—";
  const createdLabel =
    description?.lastEditedAt ?? description?.updatedAt ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("manageDescription")}</DialogTitle>
          <DialogDescription>{t("clickToManage")}</DialogDescription>
        </DialogHeader>
        {description ? (
          <DialogPanel className="space-y-4">
            <div className="rounded-md bg-muted/50 p-3">
              <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground text-xs">
                    {t("author")}
                  </dt>
                  <dd className="font-medium">{authorName}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">
                    {t("postedIn")}
                  </dt>
                  <dd className="font-medium">{target.label}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">
                    {t("createdAt")}
                  </dt>
                  <dd className="font-medium">
                    {createdLabel ? formatTimestamp(createdLabel) : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">ID</dt>
                  <dd className="font-mono text-xs">{description.id}</dd>
                </div>
              </dl>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-sm">{t("content")}</h4>
              <div className="rounded-md border bg-card p-3">
                <p className="whitespace-pre-wrap text-sm">
                  {description.content?.trim() ? description.content : "—"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                render={<Link href={target.href} />}
              >
                {t("openTarget")}
              </Button>
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
          </DialogPanel>
        ) : null}
      </DialogPopup>
    </Dialog>
  );
}
