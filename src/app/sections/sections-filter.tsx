"use client";

import type { Semester } from "@prisma/client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { SearchHelpSheet } from "@/components/search-help-sheet";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "@/i18n/routing";

interface SectionsFilterProps {
  semesters: Semester[];
  defaultValues: {
    search?: string;
    semesterId?: string;
  };
}

export function SectionsFilter({
  semesters,
  defaultValues,
}: SectionsFilterProps) {
  const t = useTranslations("sections");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentView = searchParams.get("view");
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const updateFilters = (name?: string, value?: string) => {
    const params = new URLSearchParams();
    const currentValues = { ...defaultValues };

    if (name) {
      (currentValues as any)[name] = value;
    }

    if (searchInputRef.current) {
      currentValues.search = searchInputRef.current.value;
    }

    if (currentValues.search) params.set("search", currentValues.search);
    if (currentValues.semesterId)
      params.set("semesterId", currentValues.semesterId);
    if (currentView) params.set("view", currentView);

    router.push(`${pathname}?${params.toString()}`);
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    updateFilters();
  };

  const getSelectItems = (options: Semester[], allLabel: string) => {
    return [
      { label: allLabel, value: "" },
      ...options.map((opt) => ({
        label: opt.nameCn,
        value: opt.id.toString(),
      })),
    ];
  };

  const semesterItems = getSelectItems(semesters, tCommon("allSemesters"));

  return (
    <Form className="mb-8" onSubmit={onSubmit}>
      <div className="flex flex-wrap gap-2">
        <Field>
          <Select
            name="semesterId"
            value={defaultValues.semesterId || ""}
            onValueChange={(val) =>
              updateFilters("semesterId", val ?? undefined)
            }
            items={semesterItems}
          >
            <SelectTrigger className="w-50">
              <SelectValue />
            </SelectTrigger>
            <SelectPopup>
              {semesterItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        </Field>

        <Field className="min-w-75 flex-1">
          <Input
            ref={searchInputRef}
            type="text"
            name="search"
            defaultValue={defaultValues.search}
            placeholder={t("searchPlaceholder")}
            className="w-full"
          />
        </Field>

        <SearchHelpSheet
          trigger={t("searchHelp")}
          title={t("searchHelpTitle")}
          description={t("searchHelpDescription")}
          exampleLabel={t("searchHelpExample")}
          examples={t.raw("searchHelpExamples")}
        />

        <Button type="submit">{tCommon("search")}</Button>

        {(defaultValues.search || defaultValues.semesterId) && (
          <Button
            variant="ghost"
            render={
              <Link
                href="/sections"
                className="flex items-center rounded-lg bg-accent px-4 py-2 text-foreground no-underline transition-colors hover:bg-accent/80"
              />
            }
          >
            {tCommon("clear")}
          </Button>
        )}
      </div>
    </Form>
  );
}
