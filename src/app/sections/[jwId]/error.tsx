"use client";

import { ErrorBoundary } from "@/components/error-boundary";

export default function ErrorPage(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorBoundary {...props} backHref="/sections" />;
}
