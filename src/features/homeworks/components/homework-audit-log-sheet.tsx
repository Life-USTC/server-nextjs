import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetHeader,
  SheetPanel,
  SheetPopup,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { AuditLogSheetProps } from "./homework-types";

export function AuditLogSheet({
  auditLogs,
  formatTimestamp,
  labels,
}: AuditLogSheetProps) {
  return (
    <Sheet>
      <SheetTrigger render={<Button size="sm" variant="outline" />}>
        {labels.trigger}
      </SheetTrigger>
      <SheetPopup side="right">
        <SheetHeader>
          <SheetTitle>{labels.title}</SheetTitle>
        </SheetHeader>
        <SheetPanel>
          {auditLogs.length === 0 ? (
            <p className="text-muted-foreground text-sm">{labels.empty}</p>
          ) : (
            <div className="space-y-3">
              {auditLogs.map((log) => {
                const actorName =
                  log.actor?.name || log.actor?.username || labels.trigger;
                const actionLabel =
                  log.action === "deleted" ? labels.deleted : labels.created;
                return (
                  <div
                    key={log.id}
                    className={cn(
                      "flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2",
                      "border border-border/60 bg-muted/40",
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <Badge
                        variant={
                          log.action === "deleted" ? "destructive" : "secondary"
                        }
                      >
                        {actionLabel}
                      </Badge>
                      <span className="font-medium text-foreground">
                        {log.titleSnapshot}
                      </span>
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {labels.meta({
                        name: actorName,
                        date: formatTimestamp(log.createdAt),
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SheetPanel>
      </SheetPopup>
    </Sheet>
  );
}
