"use client";

import { Search } from "lucide-react";
import type * as React from "react";
import { cn } from "@/lib/utils";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "../ui/input-group";

export function FiltersBar({
  className,
  children,
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function FiltersBarSearch({
  className,
  inputClassName,
  value,
  onChange,
  placeholder,
  ariaLabel,
  inputRef,
  type = "search",
}: {
  className?: string;
  inputClassName?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel?: string;
  inputRef?: React.Ref<HTMLInputElement>;
  type?: React.HTMLInputTypeAttribute;
}) {
  return (
    <div className={cn("min-w-0 flex-1", className)}>
      <InputGroup>
        <InputGroupAddon>
          <InputGroupText>
            <Search className="h-4 w-4" />
          </InputGroupText>
        </InputGroupAddon>
        <InputGroupInput
          ref={inputRef}
          aria-label={ariaLabel}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          type={type}
          className={inputClassName}
        />
      </InputGroup>
    </div>
  );
}
