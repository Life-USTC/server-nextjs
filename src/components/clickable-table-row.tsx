"use client";

import * as React from "react";
import { TableRow } from "@/components/ui/table";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";

interface ClickableTableRowProps extends React.ComponentProps<typeof TableRow> {
  href: string;
}

export function ClickableTableRow({
  href,
  children,
  className,
  ...props
}: ClickableTableRowProps) {
  const linkedChildren = React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) {
      return child;
    }

    const typedChild = child as React.ReactElement<{
      children?: React.ReactNode;
    }>;

    const childProps = typedChild.props as {
      children?: React.ReactNode;
    };

    return React.cloneElement(typedChild, {
      children: (
        <Link
          href={href}
          className="block h-full w-full px-2 py-2 text-inherit no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        >
          {childProps.children}
        </Link>
      ),
    });
  });

  return (
    <TableRow className={cn("[&_td]:p-0", className)} {...props}>
      {linkedChildren}
    </TableRow>
  );
}
