/**
 * Formats a time integer (hhmm or hmm) to hh:mm string format
 * @param time - Integer representing time (e.g., 800, 1030, 1400)
 * @returns Formatted time string (e.g., "08:00", "10:30", "14:00")
 */
export function formatTime(time: number | null | undefined): string {
  if (time === null || time === undefined) return "—";

  const timeStr = String(time).padStart(4, "0");
  const hours = timeStr.slice(0, 2);
  const minutes = timeStr.slice(2, 4);

  return `${hours}:${minutes}`;
}
