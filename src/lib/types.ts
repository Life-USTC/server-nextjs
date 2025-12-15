/**
 * Shared type definitions
 */

export type SerializedSemester = {
  id: number;
  jwId: number;
  name: string;
  code: string;
  startDate: string | null;
  endDate: string | null;
};
