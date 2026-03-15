import { describe, expect, it } from "vitest";

import { buttonVariants } from "@/components/ui/button";

describe("ui/button variants", () => {
  it("uses primary styles for default variant", () => {
    const classes = buttonVariants({ variant: "default" });

    expect(classes).toContain("bg-primary");
    expect(classes).toContain("text-primary-foreground");
  });

  it("uses destructive styles for destructive variant", () => {
    const classes = buttonVariants({ variant: "destructive" });

    expect(classes).toContain("bg-destructive");
  });

  it("applies size modifiers", () => {
    const base = buttonVariants({ size: "default" });
    const small = buttonVariants({ size: "sm" });
    const large = buttonVariants({ size: "lg" });

    expect(base).not.toBe(small);
    expect(base).not.toBe(large);
    expect(small).not.toBe(large);
  });
});
