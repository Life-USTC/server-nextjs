"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { unlinkAccount } from "@/app/actions/user";
import { linkAccount } from "@/lib/auth/client";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Button } from "./ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardPanel,
  CardTitle,
} from "./ui/card";
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
    linkAccount(providerId, { callbackUrl: "/settings?tab=accounts" });
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
      <CardPanel className="space-y-4">
        {providers.map((provider) => {
          const isConnected = connectedProviders.includes(provider.id);
          const isCurrentlyUnlinking = isUnlinking === provider.id;

          return (
            <div
              key={provider.id}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div className="flex items-center gap-3">
                <span className="font-medium">{provider.name}</span>
                {isConnected && (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-800 text-xs dark:bg-green-900 dark:text-green-100">
                    {t("connected")}
                  </span>
                )}
              </div>
              <div>
                {isConnected ? (
                  <AlertDialog
                    open={dialogOpen === provider.id}
                    onOpenChange={(open) =>
                      setDialogOpen(open ? provider.id : null)
                    }
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!canDisconnect || isCurrentlyUnlinking}
                      onClick={() => setDialogOpen(provider.id)}
                    >
                      {isCurrentlyUnlinking
                        ? t("disconnecting")
                        : t("disconnect")}
                    </Button>
                    <AlertDialogPopup>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {t("disconnectConfirmTitle")}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {t("disconnectConfirmDescription", {
                            provider: provider.name,
                          })}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogClose render={<Button variant="outline" />}>
                          {t("cancel")}
                        </AlertDialogClose>
                        <Button
                          variant="destructive"
                          disabled={isCurrentlyUnlinking}
                          onClick={() => handleUnlink(provider.id)}
                        >
                          {isCurrentlyUnlinking
                            ? t("disconnecting")
                            : t("disconnect")}
                        </Button>
                      </AlertDialogFooter>
                    </AlertDialogPopup>
                  </AlertDialog>
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
          <p className="text-muted-foreground text-sm">
            {t("cannotDisconnectLast")}
          </p>
        )}
      </CardPanel>
    </Card>
  );
}
