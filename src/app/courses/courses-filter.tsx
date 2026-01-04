"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import type * as React from "react";
import { useRef } from "react";
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
import { addLocalizedNames } from "@/lib/localization-helpers";

interface FilterOption {
  id: number;
  nameCn: string;
  nameEn?: string | null;
}

interface CoursesFilterProps {
  educationLevels: FilterOption[];
  categories: FilterOption[];
  classTypes: FilterOption[];
  defaultValues: {
    search?: string;
    educationLevelId?: string;
    categoryId?: string;
    classTypeId?: string;
  };
  locale: string;
}

export function CoursesFilter({
  educationLevels,
  categories,
  classTypes,
  defaultValues,
  locale,
}: CoursesFilterProps) {
  const t = useTranslations("courses");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentView = searchParams.get("view");

  // Add localized names to filter options
  const localizedEducationLevels = educationLevels.map((opt) =>
    addLocalizedNames(opt, locale),
  );
  const localizedCategories = categories.map((opt) =>
    addLocalizedNames(opt, locale),
  );
  const localizedClassTypes = classTypes.map((opt) =>
    addLocalizedNames(opt, locale),
  );

  const searchInputRef = useRef<HTMLInputElement>(null);

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
    if (currentValues.educationLevelId)
      params.set("educationLevelId", currentValues.educationLevelId);
    if (currentValues.categoryId)
      params.set("categoryId", currentValues.categoryId);
    if (currentValues.classTypeId)
      params.set("classTypeId", currentValues.classTypeId);
    if (currentView) params.set("view", currentView);

    router.push(`${pathname}?${params.toString()}`);
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    updateFilters();
  };

  const getSelectItems = (
    options: typeof localizedEducationLevels,
    allLabel: string,
  ) => {
    return [
      { label: allLabel, value: "" },
      ...options.map((opt) => ({
        label: opt.namePrimary || "",
        value: opt.id.toString(),
      })),
    ];
  };

  const educationLevelItems = getSelectItems(
    localizedEducationLevels,
    tCommon("allEducationLevels"),
  );
  const categoryItems = getSelectItems(
    localizedCategories,
    tCommon("allCategories"),
  );
  const classTypeItems = getSelectItems(
    localizedClassTypes,
    tCommon("allClassTypes"),
  );

  return (
    <Form className="mb-8" onSubmit={onSubmit}>
      <div className="flex flex-wrap gap-2">
        <Field>
          <Select
            name="educationLevelId"
            value={defaultValues.educationLevelId || ""}
            onValueChange={(val) =>
              updateFilters("educationLevelId", val ?? undefined)
            }
            items={educationLevelItems}
          >
            <SelectTrigger className="w-45">
              <SelectValue />
            </SelectTrigger>
            <SelectPopup>
              {educationLevelItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        </Field>

        <Field>
          <Select
            name="categoryId"
            value={defaultValues.categoryId || ""}
            onValueChange={(val) =>
              updateFilters("categoryId", val ?? undefined)
            }
            items={categoryItems}
          >
            <SelectTrigger className="w-45">
              <SelectValue />
            </SelectTrigger>
            <SelectPopup>
              {categoryItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        </Field>

        <Field>
          <Select
            name="classTypeId"
            value={defaultValues.classTypeId || ""}
            onValueChange={(val) =>
              updateFilters("classTypeId", val ?? undefined)
            }
            items={classTypeItems}
          >
            <SelectTrigger className="w-45">
              <SelectValue />
            </SelectTrigger>
            <SelectPopup>
              {classTypeItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        </Field>

        <Field className="flex-1 min-w-62.5">
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

        {(defaultValues.search ||
          defaultValues.educationLevelId ||
          defaultValues.categoryId ||
          defaultValues.classTypeId) && (
          <Button variant="ghost" render={<Link href="/courses" />}>
            {tCommon("clear")}
          </Button>
        )}
      </div>
    </Form>
  );
}
