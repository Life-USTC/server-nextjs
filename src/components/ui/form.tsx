"use client";

import { Form as FormPrimitive } from "@base-ui/react/form";

import { cn } from "@/lib/utils";

type FormLayout = "stack" | "toolbar";

type FormProps = FormPrimitive.Props & {
  layout?: FormLayout;
};

function Form({ className, layout = "stack", ...props }: FormProps) {
  const layoutClassName =
    layout === "toolbar"
      ? "flex w-full flex-row flex-wrap items-end gap-3"
      : "flex w-full flex-col gap-4";

  return (
    <FormPrimitive
      className={cn(layoutClassName, className)}
      data-slot="form"
      {...props}
    />
  );
}

export { Form };
