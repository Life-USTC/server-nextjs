import Link from "next/link";
import { Fragment } from "react";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
  separator?: string;
}

export default function Breadcrumb({
  items,
  className = "mb-6",
  separator = "/",
}: BreadcrumbProps) {
  const navClass = ["breadcrumb text-small text-muted", className]
    .filter(Boolean)
    .join(" ");

  return (
    <nav aria-label="Breadcrumb" className={navClass}>
      {items.map((item, index) => (
        <Fragment key={`${item.label}-${index}`}>
          {index > 0 && <span className="text-muted">{separator}</span>}
          {item.href ? (
            <Link href={item.href} className="hover:text-primary">
              {item.label}
            </Link>
          ) : (
            <span className="text-muted-strong">{item.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
