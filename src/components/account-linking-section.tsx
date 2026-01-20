"use client";

import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { unlinkAccount } from "@/app/actions/user";
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
import { toastManager } from "./ui/toast";

interface AccountLinkingSectionProps {
  user: {
    accounts: { provider: string }[];
  };
}

export function AccountLinkingSection({ user }: AccountLinkingSectionProps) {
  const t = useTranslations("profile");
  const [isUnlinking, setIsUnlinking] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState<string | null>(null);

  // Define available providers
  const providers = [
    { id: "github", name: "GitHub" },
    { id: "google", name: "Google" },
    { id: "oidc", name: "USTC" },
  ];

  const connectedProviders = user.accounts.map((account) => account.provider);
  const canDisconnect = connectedProviders.length > 1;

  const handleLink = (providerId: string) => {
    signIn(providerId, { callbackUrl: "/me" });
  };

  const handleUnlink = async (providerId: string) => {
    setIsUnlinking(providerId);

    const promise = unlinkAccount(providerId);

    toastManager.promise(promise, {
      loading: {
        title: t("disconnecting"),
        description: t("pleaseWait"),
      },
      success: (result) => {
        setIsUnlinking(null);
        setDialogOpen(null);
        if (result.error) {
          throw new Error(result.error);
        }
        return {
          title: t("disconnectSuccess"),
          description: t("disconnectSuccessDescription"),
        };
      },
      error: (error) => {
        setIsUnlinking(null);
        setDialogOpen(null);
        return {
          title: t("disconnectError"),
          description:
            error instanceof Error
              ? error.message
              : t("disconnectErrorDescription"),
        };
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("linkedAccounts")}</CardTitle>
        <CardDescription>{t("linkedAccountsDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {providers.map((provider) => {
          const isConnected = connectedProviders.includes(provider.id);
          const isCurrentlyUnlinking = isUnlinking === provider.id;

          return (
            <div
              key={provider.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <span className="font-medium">{provider.name}</span>
                {isConnected && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full dark:bg-green-900 dark:text-green-100">
                    {t("connected")}
                  </span>
                )}
              </div>
              <div>
                {isConnected ? (
                  <Dialog
                    open={dialogOpen === provider.id}
                    onOpenChange={(open) =>
                      setDialogOpen(open ? provider.id : null)
                    }
                  >
                    <DialogTrigger
                      render={
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!canDisconnect || isCurrentlyUnlinking}
                        />
                      }
                    >
                      {isCurrentlyUnlinking
                        ? t("disconnecting")
                        : t("disconnect")}
                    </DialogTrigger>
                    <DialogBackdrop />
                    <DialogPopup>
                      <DialogHeader>
                        <DialogTitle>{t("disconnectConfirmTitle")}</DialogTitle>
                        <DialogDescription>
                          {t("disconnectConfirmDescription", {
                            provider: provider.name,
                          })}
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <DialogClose render={<Button variant="outline" />}>
                          {t("cancel")}
                        </DialogClose>
                        <Button
                          variant="destructive"
                          disabled={isCurrentlyUnlinking}
                          onClick={() => handleUnlink(provider.id)}
                        >
                          {isCurrentlyUnlinking
                            ? t("disconnecting")
                            : t("disconnect")}
                        </Button>
                      </DialogFooter>
                    </DialogPopup>
                  </Dialog>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleLink(provider.id)}
                  >
                    {t("connect")}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
        {!canDisconnect && connectedProviders.length === 1 && (
          <p className="text-sm text-muted-foreground">
            {t("cannotDisconnectLast")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
