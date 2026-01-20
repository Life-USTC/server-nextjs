"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { deleteAccount } from "@/app/actions/user";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { toastManager } from "./ui/toast";

export function AccountDeletionSection() {
  const t = useTranslations("profile");
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const confirmPhrase = "DELETE";
  const isConfirmValid = confirmText === confirmPhrase;

  const handleDelete = async () => {
    if (!isConfirmValid) return;

    setIsDeleting(true);

    const promise = deleteAccount();

    toastManager.promise(promise, {
      loading: {
        title: t("deletingAccount"),
        description: t("pleaseWait"),
      },
      success: (result) => {
        setIsDeleting(false);
        setDialogOpen(false);
        if (result.error) {
          throw new Error(result.error);
        }
        // Redirect to home after successful deletion
        router.push("/");
        return {
          title: t("deleteAccountSuccess"),
          description: t("deleteAccountSuccessDescription"),
        };
      },
      error: (error) => {
        setIsDeleting(false);
        return {
          title: t("deleteAccountError"),
          description:
            error instanceof Error
              ? error.message
              : t("deleteAccountErrorDescription"),
        };
      },
    });
  };

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="text-destructive">
          {t("deleteAccountTitle")}
        </CardTitle>
        <CardDescription>{t("deleteAccountDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setConfirmText("");
          }}
        >
          <DialogTrigger
            render={<Button variant="destructive" disabled={isDeleting} />}
          >
            {t("deleteAccount")}
          </DialogTrigger>
          <DialogBackdrop />
          <DialogPopup>
            <DialogHeader>
              <DialogTitle>{t("deleteAccountConfirmTitle")}</DialogTitle>
              <DialogDescription>
                {t("deleteAccountConfirmDescription")}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground mb-2">
                {t("deleteAccountConfirmPrompt", { phrase: confirmPhrase })}
              </p>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={confirmPhrase}
                disabled={isDeleting}
              />
            </div>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                {t("cancel")}
              </DialogClose>
              <Button
                variant="destructive"
                disabled={!isConfirmValid || isDeleting}
                onClick={handleDelete}
              >
                {isDeleting ? t("deletingAccount") : t("deleteAccount")}
              </Button>
            </DialogFooter>
          </DialogPopup>
        </Dialog>
      </CardContent>
    </Card>
  );
}
