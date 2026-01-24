"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
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

interface TeachersFilterProps {
  departments: Array<{ id: number; namePrimary: string }>;
  defaultValues: {
    search?: string;
    departmentId?: string;
  };
}

export function TeachersFilter({
  departments,
  defaultValues,
}: TeachersFilterProps) {
  const t = useTranslations("teachers");
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
      (currentValues as Record<string, string | undefined>)[name] = value;
    }

    if (searchInputRef.current) {
      currentValues.search = searchInputRef.current.value;
    }

    if (currentValues.search) params.set("search", currentValues.search);
    if (currentValues.departmentId)
      params.set("departmentId", currentValues.departmentId);
    if (currentView) params.set("view", currentView);

    router.push(`${pathname}?${params.toString()}`);
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    updateFilters();
  };

  const getSelectItems = (
    options: Array<{ id: number; namePrimary: string }>,
    allLabel: string,
  ) => {
    return [
      { label: allLabel, value: "" },
      ...options.map((opt) => ({
        label: opt.namePrimary,
        value: opt.id.toString(),
      })),
    ];
  };

  const departmentItems = getSelectItems(departments, t("allDepartments"));

  return (
    <Form className="mb-8" onSubmit={onSubmit}>
      <div className="flex flex-wrap gap-2">
        <Field>
          <Select
            name="departmentId"
            value={defaultValues.departmentId || ""}
            onValueChange={(val) =>
              updateFilters("departmentId", val ?? undefined)
            }
            items={departmentItems}
          >
            <SelectTrigger className="w-50">
              <SelectValue />
            </SelectTrigger>
            <SelectPopup>
              {departmentItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        </Field>

        <Field className="flex-1 min-w-75">
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

        {(defaultValues.search || defaultValues.departmentId) && (
          <Button
            variant="ghost"
            render={
              <Link
                href="/teachers"
                className="px-4 py-2 bg-accent hover:bg-accent/80 text-foreground rounded-lg transition-colors no-underline flex items-center"
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
