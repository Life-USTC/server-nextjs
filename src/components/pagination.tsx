"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

export default function Pagination({
  currentPage,
  totalPages,
  baseUrl,
  searchParams,
}: {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
  searchParams?: Record<string, string>;
}) {
  const t = useTranslations("common");

  const buildUrl = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", page.toString());
    return `${baseUrl}?${params.toString()}`;
  };

  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else if (currentPage <= 3) {
      for (let i = 1; i <= maxVisible; i++) {
        pages.push(i);
      }
    } else if (currentPage >= totalPages - 2) {
      for (let i = totalPages - maxVisible + 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      for (let i = currentPage - 2; i <= currentPage + 2; i++) {
        pages.push(i);
      }
    }

    return pages;
  };

  return (
    <div className="flex items-center justify-center gap-2">
      <Link
        href={buildUrl(currentPage - 1)}
        className={`px-4 py-2 bg-surface-elevated border border-base rounded-lg transition-colors no-underline ${
          currentPage === 1
            ? "opacity-50 pointer-events-none"
            : "hover:bg-surface"
        }`}
        aria-disabled={currentPage === 1}
        tabIndex={currentPage === 1 ? -1 : undefined}
      >
        {t("previous")}
      </Link>

      <div className="flex gap-1">
        {getPageNumbers().map((pageNum) => (
          <Link
            key={pageNum}
            href={buildUrl(pageNum)}
            className={`px-4 py-2 rounded-lg transition-colors no-underline ${
              currentPage === pageNum
                ? "bg-primary text-on-primary"
                : "bg-surface-elevated border border-base hover:bg-surface"
            }`}
            aria-current={currentPage === pageNum ? "page" : undefined}
          >
            {pageNum}
          </Link>
        ))}
      </div>

      <Link
        href={buildUrl(currentPage + 1)}
        className={`px-4 py-2 bg-surface-elevated border border-base rounded-lg transition-colors no-underline ${
          currentPage === totalPages
            ? "opacity-50 pointer-events-none"
            : "hover:bg-surface"
        }`}
        aria-disabled={currentPage === totalPages}
        tabIndex={currentPage === totalPages ? -1 : undefined}
      >
        {t("next")}
      </Link>
    </div>
  );
}
