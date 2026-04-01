export type PageToken = number | "ellipsis";

export function getPaginationTokens(options: {
  currentPage: number;
  totalPages: number;
  maxVisible?: number;
}): PageToken[] {
  const { currentPage, totalPages } = options;
  const maxVisible = Math.max(3, options.maxVisible ?? 5);

  if (totalPages <= 1) return [1];

  const pages: PageToken[] = [];

  if (totalPages <= maxVisible) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
    return pages;
  }

  const radius = Math.floor(maxVisible / 2);
  let start = Math.max(1, currentPage - radius);
  let end = Math.min(totalPages, currentPage + radius);

  const windowSize = end - start + 1;
  if (windowSize < maxVisible) {
    if (start === 1)
      end = Math.min(totalPages, end + (maxVisible - windowSize));
    else if (end === totalPages)
      start = Math.max(1, start - (maxVisible - windowSize));
  }

  if (start > 1) {
    pages.push(1);
    if (start > 2) pages.push("ellipsis");
  }

  for (let i = start; i <= end; i++) pages.push(i);

  if (end < totalPages) {
    if (end < totalPages - 1) pages.push("ellipsis");
    pages.push(totalPages);
  }

  return pages;
}
