"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Toggle, ToggleGroup } from "@/components/ui/toggle-group";

type ViewMode = "card" | "table";

export function ViewSwitcher() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentView = (searchParams.get("view") as ViewMode) || "table";

  const handleViewChange = (values: string[]) => {
    const value = values[0];
    if (!value) return;

    const params = new URLSearchParams(searchParams.toString());
    if (value === "table") {
      params.delete("view");
    } else {
      params.set("view", value);
    }

    const queryString = params.toString();
    const newPath = queryString ? `?${queryString}` : "";
    router.push(newPath);
  };

  return (
    <ToggleGroup
      value={[currentView]}
      onValueChange={handleViewChange}
      variant="outline"
    >
      <Toggle value="card" aria-label="Card view">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <title>Card view</title>
          <rect width="7" height="7" x="3" y="3" rx="1" />
          <rect width="7" height="7" x="14" y="3" rx="1" />
          <rect width="7" height="7" x="14" y="14" rx="1" />
          <rect width="7" height="7" x="3" y="14" rx="1" />
        </svg>
      </Toggle>
      <Toggle value="table" aria-label="Table view">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <title>Table view</title>
          <path d="M3 3h18v18H3z" />
          <path d="M3 9h18" />
          <path d="M3 15h18" />
          <path d="M9 3v18" />
        </svg>
      </Toggle>
    </ToggleGroup>
  );
}
