"use client";

import type * as React from "react";
import { useEffect, useState } from "react";
import { Tabs } from "@/components/ui/tabs";

type CommentAwareTabsProps = {
  defaultValue: string;
  commentValue: string;
  className?: string;
  children: React.ReactNode;
};

export function CommentAwareTabs({
  defaultValue,
  commentValue,
  className,
  children,
}: CommentAwareTabsProps) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash.startsWith("#comment-")) {
        setValue(commentValue);
      }
    };

    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, [commentValue]);

  return (
    <Tabs className={className} value={value} onValueChange={setValue}>
      {children}
    </Tabs>
  );
}
