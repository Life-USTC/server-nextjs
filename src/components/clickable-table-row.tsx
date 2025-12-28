"use client";

import { useRouter } from "next/navigation";
import type * as React from "react";
import { TableRow } from "@/components/ui/table";

interface ClickableTableRowProps extends React.ComponentProps<typeof TableRow> {
  href: string;
}

export function ClickableTableRow({
  href,
  children,
  className,
  ...props
}: ClickableTableRowProps) {
  const router = useRouter();

  const handleClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on a link or button inside the row
    const target = e.target as HTMLElement;
    if (target.tagName === "A" || target.closest("a")) {
      return;
    }
    router.push(href);
  };

  return (
    <TableRow
      className={`cursor-pointer ${className || ""}`}
      onClick={handleClick}
      {...props}
    >
      {children}
    </TableRow>
  );
}
