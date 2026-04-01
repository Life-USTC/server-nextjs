"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import type { SelectItemOption } from "@/components/filters/list-filters-toolbar";
import { ListFiltersToolbar } from "@/components/filters/list-filters-toolbar";
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
  const searchParams = useSearchParams();
  const currentView = searchParams.get("view");

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

  const departmentItems: SelectItemOption[] = getSelectItems(
    departments,
    t("allDepartments"),
  );

  return (
    <ListFiltersToolbar<TeachersFilterProps["defaultValues"]>
      defaultValues={defaultValues}
      preserveKeys={["view"]}
      submitLabel={tCommon("search")}
      clearRender={<Link href="/teachers" />}
      clearLabel={tCommon("clear")}
      showClearWhen={(values) => Boolean(values.search || values.departmentId)}
      fields={[
        {
          kind: "select",
          name: "departmentId",
          value: defaultValues.departmentId || "",
          items: departmentItems,
          triggerClassName: "w-50",
        },
        {
          kind: "search",
          name: "search",
          defaultValue: defaultValues.search,
          placeholder: t("searchPlaceholder"),
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
