"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
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

interface SemesterOption {
  id: number;
  name: string;
}

interface SectionsFilterProps {
  semesters: SemesterOption[];
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

    router.push(`${pathname}?${params.toString()}`);
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    updateFilters();
  };

  const getSelectItems = (options: SemesterOption[], allLabel: string) => {
    return [
      { label: allLabel, value: "" },
      ...options.map((opt) => ({
        label: opt.name,
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
            onValueChange={(val) => updateFilters("semesterId", val)}
            items={semesterItems}
          >
            <SelectTrigger className="w-[200px]">
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

        <Field className="flex-1 min-w-[300px]">
          <Input
            ref={searchInputRef}
            type="text"
            name="search"
            defaultValue={defaultValues.search}
            placeholder={t("searchPlaceholder")}
            className="w-full"
          />
        </Field>

        <Button type="submit">{tCommon("search")}</Button>

        {(defaultValues.search || defaultValues.semesterId) && (
          <Button
            variant="ghost"
            render={
              <Link
                href="/sections"
                className="px-4 py-2 bg-interactive hover:bg-interactive-hover text-muted-strong rounded-lg transition-colors no-underline flex items-center"
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
