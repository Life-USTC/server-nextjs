import type { LucideIcon } from "lucide-react";
import type { useTranslations } from "next-intl";

export type HomeworkWithSection = {
  id: string;
  title: string;
  submissionDueAt: Date | null;
  homeworkCompletions: Array<{ completedAt: Date }>;
  section: {
    jwId: number | null;
    course: { namePrimary: string | null } | null;
  } | null;
};

export type SessionItem = {
  id: string;
  sectionJwId: number | null;
  courseName: string;
  date: Date;
  startTime: number;
  endTime: number;
  location: string;
};

export type ScheduleTimeItem = {
  date: Date;
  startTime: number;
  endTime: number;
};

export type ExamItem = {
  id: string;
  courseName: string;
  date: Date | null;
  startTime: number | null;
  endTime: number | null;
};

export type TimeSlot = {
  key: string;
  startTime: number;
  endTime: number;
};

export type FocusCardItem = {
  key: string;
  icon: LucideIcon;
  title: string;
  name: string;
  meta: string;
  sub: string;
};

export type Translate = ReturnType<typeof useTranslations>;

export type SemesterSummary = {
  id: number;
  nameCn: string | null;
  startDate: Date | null;
  endDate: Date | null;
};

export type SectionWithRelations = {
  id: number;
  jwId: number | null;
  course: { namePrimary: string | null };
  semester: { id: number } | null;
  schedules: Array<{
    id: number;
    date: Date | null;
    startTime: number;
    endTime: number;
    customPlace: string | null;
    room: {
      namePrimary: string;
      building: {
        namePrimary: string;
        campus: { namePrimary: string } | null;
      } | null;
    } | null;
  }>;
  exams: Array<{
    id: number;
    examDate: Date | null;
    startTime: number | null;
    endTime: number | null;
  }>;
};

export type SubscriptionWithSections = {
  sections: SectionWithRelations[];
};

export type SubscriptionSchedule = SectionWithRelations["schedules"][number];
