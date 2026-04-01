import type * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardPanel } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";

type DataStateProps = {
  loading?: boolean;
  error?: string | null;
  onRetry?: (() => void) | null;
  retryLabel?: React.ReactNode;
  empty?: boolean;
  emptyTitle?: React.ReactNode;
  emptyDescription?: React.ReactNode;
  loadingFallback?: React.ReactNode;
  emptyFallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
  children: React.ReactNode;
};

export function DataState({
  loading,
  error,
  onRetry,
  retryLabel,
  empty,
  emptyTitle,
  emptyDescription,
  loadingFallback,
  emptyFallback,
  errorFallback,
  children,
}: DataStateProps) {
  if (loading) {
    return (
      loadingFallback ?? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )
    );
  }

  if (error) {
    return (
      errorFallback ?? (
        <Card className="border-dashed">
          <CardPanel className="space-y-2">
            <p className="text-muted-foreground text-sm">{error}</p>
            {onRetry ? (
              <Button variant="outline" onClick={onRetry}>
                {retryLabel}
              </Button>
            ) : null}
          </CardPanel>
        </Card>
      )
    );
  }

  if (empty) {
    return (
      emptyFallback ?? (
        <Empty>
          <EmptyHeader>
            {emptyTitle ? <EmptyTitle>{emptyTitle}</EmptyTitle> : null}
            {emptyDescription ? (
              <EmptyDescription>{emptyDescription}</EmptyDescription>
            ) : null}
          </EmptyHeader>
        </Empty>
      )
    );
  }

  return children;
}
