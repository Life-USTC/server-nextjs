"use client";

import { useRouter } from "next/navigation";
import type { SerializedSemester } from "@/lib/types";

interface SemesterFilterProps {
  semesters: SerializedSemester[];
  currentSemesterId?: string;
}

export default function SemesterFilter({
  semesters,
  currentSemesterId,
}: SemesterFilterProps) {
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value) {
      router.push(`/sections?semesterId=${value}`);
    } else {
      router.push("/sections");
    }
  };

  return (
    <select
      value={currentSemesterId || ""}
      onChange={handleChange}
      className="px-4 py-2 bg-surface-elevated border border-base rounded-lg hover:bg-surface transition-colors font-medium cursor-pointer"
    >
      <option value="">All Semesters</option>
      {semesters.map((semester) => (
        <option key={semester.id} value={semester.id}>
          {semester.name}
        </option>
      ))}
    </select>
  );
}
