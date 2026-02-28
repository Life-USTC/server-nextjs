"use client";

import { useTranslations } from "next-intl";
import type React from "react";
import { useState } from "react";
import {
  BulkImportSections,
  type BulkImportSectionsProps,
} from "@/components/bulk-import-sections";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function BulkImportSectionsDialog({
  semesters,
  defaultSemesterId,
  triggerVariant = "outline",
  triggerSize = "sm",
}: Pick<BulkImportSectionsProps, "semesters" | "defaultSemesterId"> & {
  triggerVariant?: React.ComponentProps<typeof Button>["variant"];
  triggerSize?: React.ComponentProps<typeof Button>["size"];
}) {
  const t = useTranslations("subscriptions");
  const [open, setOpen] = useState(false);
  const [matchButtonProps, setMatchButtonProps] = useState<{
    onClick: () => void;
    disabled: boolean;
    label: string;
  } | null>(null);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setMatchButtonProps(null);
      }}
    >
      <DialogTrigger
        render={<Button variant={triggerVariant} size={triggerSize} />}
      >
        {t("bulkImport.title")}
      </DialogTrigger>
      <DialogPopup className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("bulkImport.title")}</DialogTitle>
          <DialogDescription>{t("bulkImport.description")}</DialogDescription>
        </DialogHeader>
        <DialogPanel>
          <BulkImportSections
            semesters={semesters}
            defaultSemesterId={defaultSemesterId}
            variant="plain"
            showDescription={false}
            onMatchButtonRender={setMatchButtonProps}
          />
        </DialogPanel>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            {t("bulkImport.cancel")}
          </DialogClose>
          {matchButtonProps && (
            <Button
              onClick={matchButtonProps.onClick}
              disabled={matchButtonProps.disabled}
            >
              {matchButtonProps.label}
            </Button>
          )}
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
