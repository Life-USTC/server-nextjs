"use client";

import { CheckCircle, Download, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import {
  activateBusVersion,
  deleteBusVersion,
  triggerBusImport,
} from "@/app/actions/bus";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

type VersionRow = {
  id: number;
  key: string;
  title: string;
  isEnabled: boolean;
  importedAt: string;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
  sourceMessage: string | null;
  tripCount: number;
};

export function BusVersionManager({ versions }: { versions: VersionRow[] }) {
  const t = useTranslations("adminBus");
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  function handleActivate(versionId: number) {
    setLoadingAction(`activate-${versionId}`);
    startTransition(async () => {
      const result = await activateBusVersion(versionId);
      setLoadingAction(null);
      if ("error" in result) {
        toast({ title: t("actionFailed"), description: result.error });
      } else {
        toast({ title: t("activated") });
        router.refresh();
      }
    });
  }

  function handleDelete(versionId: number) {
    if (!window.confirm(t("deleteConfirm"))) return;
    setLoadingAction(`delete-${versionId}`);
    startTransition(async () => {
      const result = await deleteBusVersion(versionId);
      setLoadingAction(null);
      if ("error" in result) {
        toast({ title: t("actionFailed"), description: result.error });
      } else {
        toast({ title: t("deleted") });
        router.refresh();
      }
    });
  }

  function handleImport() {
    setLoadingAction("import");
    startTransition(async () => {
      const result = await triggerBusImport();
      setLoadingAction(null);
      if ("error" in result) {
        toast({ title: t("importFailed"), description: result.error });
      } else {
        toast({
          title: t("importSuccess"),
          description: result.message,
        });
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg">{t("versionsTitle")}</h2>
        <Button onClick={handleImport} disabled={isPending} size="sm">
          {loadingAction === "import" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          {t("importAction")}
        </Button>
      </div>

      {versions.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground text-sm">
          {t("noVersions")}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("colTitle")}</TableHead>
                <TableHead>{t("colKey")}</TableHead>
                <TableHead className="text-right">{t("colTrips")}</TableHead>
                <TableHead>{t("colImported")}</TableHead>
                <TableHead>{t("colEffective")}</TableHead>
                <TableHead>{t("colStatus")}</TableHead>
                <TableHead className="text-right">{t("colActions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {versions.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>
                    <div>
                      <span className="font-medium">{v.title}</span>
                      {v.sourceMessage ? (
                        <p className="text-muted-foreground text-xs">
                          {v.sourceMessage}
                        </p>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{v.key}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {v.tripCount}
                  </TableCell>
                  <TableCell className="text-xs tabular-nums">
                    {v.importedAt.slice(0, 16).replace("T", " ")}
                  </TableCell>
                  <TableCell className="text-xs tabular-nums">
                    {v.effectiveFrom || v.effectiveUntil
                      ? `${v.effectiveFrom?.slice(0, 10) ?? "—"} ~ ${v.effectiveUntil?.slice(0, 10) ?? "—"}`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {v.isEnabled ? (
                      <Badge variant="default" size="sm">
                        {t("statusActive")}
                      </Badge>
                    ) : (
                      <Badge variant="outline" size="sm">
                        {t("statusInactive")}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {!v.isEnabled && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleActivate(v.id)}
                          disabled={isPending}
                        >
                          {loadingAction === `activate-${v.id}` ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      )}
                      {!v.isEnabled && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(v.id)}
                          disabled={isPending}
                        >
                          {loadingAction === `delete-${v.id}` ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
