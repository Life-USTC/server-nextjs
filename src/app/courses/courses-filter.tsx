"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import type { SelectItemOption } from "@/components/filters/list-filters-toolbar";
import { ListFiltersToolbar } from "@/components/filters/list-filters-toolbar";
import { Link } from "@/i18n/routing";

interface FilterOption {
  id: number;
  namePrimary: string;
  nameSecondary?: string | null;
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
}

type CoursesFilterValues = CoursesFilterProps["defaultValues"];

export function CoursesFilter({
  educationLevels,
  categories,
  classTypes,
  defaultValues,
}: CoursesFilterProps) {
  const t = useTranslations("courses");
  const tCommon = useTranslations("common");
  const searchParams = useSearchParams();
  const currentView = searchParams.get("view");

  const getSelectItems = (options: FilterOption[], allLabel: string) => {
    return [
      { label: allLabel, value: "" },
      ...options.map((opt) => ({
        label: opt.namePrimary,
        value: opt.id.toString(),
      })),
    ];
  };

  const educationLevelItems: SelectItemOption[] = getSelectItems(
    educationLevels,
    tCommon("allEducationLevels"),
  );
  const categoryItems: SelectItemOption[] = getSelectItems(
    categories,
    tCommon("allCategories"),
  );
  const classTypeItems: SelectItemOption[] = getSelectItems(
    classTypes,
    tCommon("allClassTypes"),
  );

  return (
    <ListFiltersToolbar<CoursesFilterValues>
      defaultValues={defaultValues}
      preserveKeys={["view"]}
      submitLabel={tCommon("search")}
      formClassName="flex-wrap md:flex-nowrap md:gap-2"
      clearRender={<Link href="/courses" />}
      clearLabel={tCommon("clear")}
      showClearWhen={(values) =>
        Boolean(
          values.search ||
            values.educationLevelId ||
            values.categoryId ||
            values.classTypeId,
        )
      }
      fields={[
        {
          kind: "select",
          name: "educationLevelId",
          value: defaultValues.educationLevelId || "",
          items: educationLevelItems,
          triggerClassName: "w-40",
        },
        {
          kind: "select",
          name: "categoryId",
          value: defaultValues.categoryId || "",
          items: categoryItems,
          triggerClassName: "w-40",
        },
        {
          kind: "select",
          name: "classTypeId",
          value: defaultValues.classTypeId || "",
          items: classTypeItems,
          triggerClassName: "w-40",
        },
        {
          kind: "search",
          name: "search",
          defaultValue: defaultValues.search,
          placeholder: t("searchPlaceholder"),
          fieldClassName: "min-w-0 flex-1",
        },
        ...(currentView
          ? [
              {
                kind: "extra" as const,
                key: "preserve-view",
                node: <input type="hidden" name="view" value={currentView} />,
              },
            ]
          : []),
      ]}
    />
  );
}
