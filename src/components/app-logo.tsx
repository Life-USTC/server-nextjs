import Image from "next/image";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";

type AppLogoProps = {
  className?: string;
  iconClassName?: string;
  labelClassName?: string;
  compact?: boolean;
};

export function AppLogo({
  className,
  iconClassName,
  labelClassName,
  compact = false,
}: AppLogoProps) {
  return (
    <Link
      href="/"
      data-slot="app-logo-link"
      className={cn(
        "group inline-flex items-center gap-2.5 py-2 no-underline transition-opacity hover:opacity-75",
        className,
      )}
    >
      <span
        data-slot="app-logo-icon"
        className={cn(
          "relative inline-flex size-7 shrink-0 overflow-hidden rounded-[28%]",
          iconClassName,
        )}
      >
        <Image
          src="/images/icon.png"
          alt="Life@USTC"
          fill
          priority
          sizes="28px"
          className="pointer-events-none object-cover"
        />
      </span>
      <span
        data-slot="app-logo-label"
        className={cn(
          "font-heading font-semibold text-[1.0625rem] text-foreground/95 leading-none tracking-[-0.02em]",
          compact && "hidden sm:inline",
          labelClassName,
        )}
      >
        Life@USTC
      </span>
    </Link>
  );
}
