export function formatExamTypeLabel(
  examType: number | null | undefined,
  tSection: (key: string) => string,
) {
  return examType === 1
    ? tSection("examTypeMidterm")
    : examType === 2
      ? tSection("examTypeFinal")
      : tSection("examEvent");
}
