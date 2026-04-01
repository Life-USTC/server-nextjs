import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";

type ScheduleSessionLinkProps = {
  href: string;
  courseName: string;
  location: string;
  timeLabel?: string;
  durationLabel?: string;
  variant?: "compact" | "detailed";
  className?: string;
};

export function ScheduleSessionLink({
  href,
  courseName,
  location,
  timeLabel,
  durationLabel,
  variant = "compact",
  className,
}: ScheduleSessionLinkProps) {
  if (variant === "detailed") {
    return (
      <Link
        href={href}
        className={cn(
          "flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card/72 px-3 py-2.5 no-underline transition-colors hover:bg-background/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          className,
        )}
      >
        <div className="min-w-0">
          <p className="truncate font-medium text-sm">{courseName}</p>
          <p className="truncate text-muted-foreground text-xs">{location}</p>
        </div>
        {(timeLabel || durationLabel) && (
          <div className="shrink-0 text-right">
            {timeLabel ? (
              <p className="font-medium text-sm">{timeLabel}</p>
            ) : null}
            {durationLabel ? (
              <p className="text-muted-foreground text-xs">{durationLabel}</p>
            ) : null}
          </div>
        )}
      </Link>
    );
  }

  const metaParts = [timeLabel, location].filter(Boolean);

  return (
    <Link
      href={href}
      className={cn(
        "block rounded-xl border border-border/70 bg-card/72 px-3 py-2.5 no-underline transition-colors hover:bg-background/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
    >
      <p className="truncate font-medium text-sm">{courseName}</p>
      {metaParts.length > 0 ? (
        <p className="truncate text-muted-foreground text-xs">
          {metaParts.join(" · ")}
        </p>
      ) : null}
    </Link>
  );
}
