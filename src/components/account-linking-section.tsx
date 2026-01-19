"use client";

import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

interface AccountLinkingSectionProps {
  user: {
    accounts: { provider: string }[];
  };
}

export function AccountLinkingSection({ user }: AccountLinkingSectionProps) {
  const t = useTranslations("profile");

  // Define available providers
  const providers = [
    { id: "github", name: "GitHub" },
    { id: "google", name: "Google" },
    { id: "oidc", name: "USTC (OIDC)" },
  ];

  const connectedProviders = user.accounts.map((account) => account.provider);

  const handleLink = (providerId: string) => {
    signIn(providerId, { callbackUrl: "/me" });
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
                  <Button variant="outline" disabled size="sm">
                    {t("connected")}
                  </Button>
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
      </CardContent>
    </Card>
  );
}
