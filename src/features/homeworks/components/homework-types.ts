import type { useTranslations } from "next-intl";

export type ViewerSummary = {
  userId: string | null;
  name: string | null;
  image: string | null;
  isAdmin: boolean;
  isAuthenticated: boolean;
  isSuspended: boolean;
  suspensionReason: string | null;
  suspensionExpiresAt: string | null;
};

export type UserSummary = {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
};

export type HomeworkEntry = {
  id: string;
  title: string;
  isMajor: boolean;
  requiresTeam: boolean;
  publishedAt: string | null;
  submissionStartAt: string | null;
  submissionDueAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  createdById: string | null;
  commentCount: number;
  completion: {
    completedAt: string;
  } | null;
  description: {
    id: string;
    content: string;
    updatedAt: string | null;
  } | null;
  createdBy: UserSummary | null;
  updatedBy: UserSummary | null;
  deletedBy: UserSummary | null;
};

export type AuditLogEntry = {
  id: string;
  action: "created" | "deleted";
  titleSnapshot: string;
  createdAt: string;
  actor: UserSummary | null;
};

export type HomeworkResponse = {
  homeworks: HomeworkEntry[];
  auditLogs: AuditLogEntry[];
  viewer: ViewerSummary;
};

export type DescriptionHistoryEntry = {
  id: string;
  createdAt: string;
  previousContent: string | null;
  nextContent: string;
  editor: UserSummary | null;
};

export type HomeworkCardEditFormProps = {
  homework: HomeworkEntry;
  formatTimestamp: (value: string | Date) => string;
  canDelete: boolean;
  semesterStartDate: Date | null;
  semesterEndDate: Date | null;
  onUpdate: (
    homeworkId: string,
    data: {
      title: string;
      description: string;
      publishedAt: string;
      submissionStartAt: string;
      submissionDueAt: string;
      isMajor: boolean;
      requiresTeam: boolean;
    },
    currentDescription: string,
  ) => Promise<boolean>;
  onDelete: (homeworkId: string) => Promise<boolean>;
  onCancel: () => void;
  t: ReturnType<typeof useTranslations>;
  tComments: ReturnType<typeof useTranslations>;
  tDescriptions: ReturnType<typeof useTranslations>;
};

export type AuditLogSheetProps = {
  auditLogs: AuditLogEntry[];
  formatTimestamp: (value: string | Date) => string;
  labels: {
    title: string;
    empty: string;
    created: string;
    deleted: string;
    meta: (params: { name: string; date: string }) => string;
    trigger: string;
  };
};

export const EMPTY_VIEWER: ViewerSummary = {
  userId: null,
  name: null,
  image: null,
  isAdmin: false,
  isAuthenticated: false,
  isSuspended: false,
  suspensionReason: null,
  suspensionExpiresAt: null,
};
