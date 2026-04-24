"use client";

import { ShieldCheck } from "lucide-react";
import { PageStatCard, PageStatGrid } from "@/components/page-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  AUTH_METHOD_OPTIONS,
  authMethodLeadIcon,
  getClientTypeBadgeVariant,
  type OAuthTranslator,
} from "./oauth-client-manager-shared";

export function OAuthClientOverview({
  clientCount,
  trustedCount,
  publicCount,
  onOpenCreateDialog,
  t,
}: {
  clientCount: number;
  trustedCount: number;
  publicCount: number;
  onOpenCreateDialog: (method?: string) => void;
  t: OAuthTranslator;
}) {
  const LeadIcon = authMethodLeadIcon;

  return (
    <>
      <Card className="overflow-hidden border-border/80 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.12),transparent_38%)]">
        <CardPanel className="grid gap-6 py-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/72 px-3 py-1 text-[11px] text-muted-foreground uppercase tracking-[0.18em]">
              <ShieldCheck className="size-3.5" />
              <span translate="no">Better Auth OAuth Provider</span>
            </div>
            <div className="space-y-2">
              <h2 className="text-balance font-heading text-2xl tracking-tight md:text-[2rem]">
                {t("panelGuideTitle")}
              </h2>
              <p className="max-w-2xl text-muted-foreground text-sm leading-6 md:text-[0.95rem]">
                {t("panelGuideDescription")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{t("strategyFirstPartyTitle")}</Badge>
              <Badge variant="outline">{t("strategyPublicTitle")}</Badge>
              <Badge variant="outline">{t("strategyAdvancedTitle")}</Badge>
            </div>
          </div>

          <div className="rounded-[1.35rem] border border-border/80 bg-background/80 p-5 shadow-xs">
            <p className="font-semibold text-base">{t("createClient")}</p>
            <p className="mt-2 text-muted-foreground text-sm leading-6">
              {t("createClientHint")}
            </p>
            <Button
              type="button"
              size="lg"
              className="mt-5 w-full"
              onClick={() => onOpenCreateDialog()}
            >
              <LeadIcon className="size-4.5" />
              {t("createClient")}
            </Button>
            <p className="mt-3 text-muted-foreground text-xs leading-5">
              {t("createClientFootnote")}
            </p>
          </div>
        </CardPanel>
      </Card>

      <PageStatGrid>
        <PageStatCard label={t("overviewClients")} value={clientCount} />
        <PageStatCard label={t("overviewTrusted")} value={trustedCount} />
        <PageStatCard label={t("overviewPublic")} value={publicCount} />
      </PageStatGrid>

      <Card>
        <CardHeader>
          <CardTitle>{t("strategyTitle")}</CardTitle>
          <CardDescription>{t("strategyDescription")}</CardDescription>
        </CardHeader>
        <CardPanel className="grid gap-4 xl:grid-cols-3">
          {AUTH_METHOD_OPTIONS.map((option) => {
            const Icon = option.icon;

            return (
              <Card
                key={option.value}
                className={cn(
                  "h-full gap-4 rounded-2xl py-4",
                  option.accentClassName,
                )}
              >
                <CardPanel className="space-y-4">
                  <div
                    className={cn(
                      "flex size-11 items-center justify-center rounded-2xl border",
                      option.accentIconClassName,
                    )}
                  >
                    <Icon className="size-5" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-base">
                        {t(option.strategyTitleKey)}
                      </p>
                      <Badge variant={getClientTypeBadgeVariant(option.value)}>
                        {t(option.labelKey)}
                      </Badge>
                    </div>
                    <p className="text-sm leading-6">
                      {t(option.strategyDescriptionKey)}
                    </p>
                    <p className="text-muted-foreground text-xs leading-5">
                      {t(option.strategyHintKey)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenCreateDialog(option.value)}
                  >
                    {t("useThisPattern")}
                  </Button>
                </CardPanel>
              </Card>
            );
          })}
        </CardPanel>
      </Card>
    </>
  );
}
