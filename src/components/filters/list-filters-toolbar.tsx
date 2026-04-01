"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type * as React from "react";
import { Fragment, useRef } from "react";
import { PageToolbar } from "@/components/page-layout";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buildSearchParams } from "@/lib/navigation/search-params";

export type SelectItemOption = { label: string; value: string };

type SelectField<TValues extends Record<string, string | undefined>> = {
  kind: "select";
  name: keyof TValues;
  value: string;
  items: SelectItemOption[];
  triggerClassName?: string;
};

type SearchField = {
  kind: "search";
  name: "search";
  defaultValue?: string;
  placeholder: string;
  fieldClassName?: string;
};

type ExtraField = { kind: "extra"; key: string; node: React.ReactNode };

export type ListFilterField<
  TValues extends Record<string, string | undefined>,
> = SelectField<TValues> | SearchField | ExtraField;

type ListFiltersToolbarProps<
  TValues extends Record<string, string | undefined>,
> = {
  defaultValues: TValues;
  fields: Array<ListFilterField<TValues>>;
  preserveKeys?: string[];
  submitLabel: string;
  clearRender: React.ReactElement;
  clearLabel: string;
  showClearWhen: (values: TValues) => boolean;
  toolbarClassName?: string;
  formClassName?: string;
};

export function ListFiltersToolbar<
  TValues extends Record<string, string | undefined>,
>({
  defaultValues,
  fields,
  preserveKeys = ["view"],
  submitLabel,
  clearRender,
  clearLabel,
  showClearWhen,
  toolbarClassName,
  formClassName,
}: ListFiltersToolbarProps<TValues>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const preserve: Record<string, string | null> = {};
  for (const key of preserveKeys) {
    preserve[key] = searchParams.get(key);
  }

  const updateFilters = (name?: keyof TValues, value?: string) => {
    const currentValues: TValues = { ...defaultValues };

    if (name) {
      (currentValues as Record<string, string | undefined>)[String(name)] =
        value;
    }

    if (searchInputRef.current) {
      (currentValues as Record<string, string | undefined>).search =
        searchInputRef.current.value;
    }

    const query = buildSearchParams({
      preserve,
      values: currentValues,
    });

    router.push(`${pathname}?${query}`);
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    updateFilters();
  };

  return (
    <PageToolbar className={toolbarClassName}>
      <Form layout="toolbar" className={formClassName} onSubmit={onSubmit}>
        {fields.map((field) => {
          if (field.kind === "extra") {
            return <Fragment key={field.key}>{field.node}</Fragment>;
          }

          if (field.kind === "search") {
            return (
              <Field
                key={field.name}
                className={field.fieldClassName ?? "min-w-0 flex-1"}
              >
                <InputGroup>
                  <InputGroupAddon>
                    <InputGroupText>
                      <Search className="size-4" />
                    </InputGroupText>
                  </InputGroupAddon>
                  <InputGroupInput
                    ref={searchInputRef}
                    defaultValue={field.defaultValue}
                    name={field.name}
                    placeholder={field.placeholder}
                    type="text"
                  />
                </InputGroup>
              </Field>
            );
          }

          return (
            <Field key={String(field.name)} className="w-auto">
              <Select
                name={String(field.name)}
                value={field.value}
                onValueChange={(val) =>
                  updateFilters(field.name, val ?? undefined)
                }
                items={field.items}
              >
                <SelectTrigger className={field.triggerClassName ?? "w-50"}>
                  <SelectValue />
                </SelectTrigger>
                <SelectPopup>
                  {field.items.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            </Field>
          );
        })}

        <Button type="submit">{submitLabel}</Button>

        {showClearWhen(defaultValues) ? (
          <Button render={clearRender} variant="outline">
            {clearLabel}
          </Button>
        ) : null}
      </Form>
    </PageToolbar>
  );
}
