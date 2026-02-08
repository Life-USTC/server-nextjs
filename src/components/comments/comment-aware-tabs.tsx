"use client";

import type * as React from "react";
import { useEffect, useState } from "react";
import { Tabs } from "@/components/ui/tabs";

type CommentAwareTabsProps = {
  defaultValue: string;
  commentValue: string;
  hashMappings?: readonly { prefix: string; value: string }[];
  tabValues?: readonly string[];
  tabHashPrefix?: string;
  className?: string;
  children: React.ReactNode;
};

const EMPTY_HASH_MAPPINGS: readonly { prefix: string; value: string }[] = [];
const EMPTY_TAB_VALUES: readonly string[] = [];

export function CommentAwareTabs({
  defaultValue,
  commentValue,
  hashMappings = EMPTY_HASH_MAPPINGS,
  tabValues = EMPTY_TAB_VALUES,
  tabHashPrefix = "#tab-",
  className,
  children,
}: CommentAwareTabsProps) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash.startsWith(tabHashPrefix)) {
        const nextValue = hash.slice(tabHashPrefix.length);
        if (!tabValues.length || tabValues.includes(nextValue)) {
          setValue(nextValue);
        }
        return;
      }

      const mappings = [
        { prefix: "#comment-", value: commentValue },
        ...hashMappings,
      ];
      for (const mapping of mappings) {
        if (hash.startsWith(mapping.prefix)) {
          setValue(mapping.value);
          return;
        }
      }
    };

    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, [commentValue, hashMappings, tabHashPrefix, tabValues]);

  const handleValueChange = (nextValue: string) => {
    setValue(nextValue);
    if (typeof window === "undefined") return;
    if (tabValues.length && !tabValues.includes(nextValue)) return;
    const nextHash = `${tabHashPrefix}${nextValue}`;
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    }
  };

  return (
    <Tabs className={className} value={value} onValueChange={handleValueChange}>
      {children}
    </Tabs>
  );
}
