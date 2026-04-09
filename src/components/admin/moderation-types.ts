export type CommentStatus = "active" | "softbanned" | "deleted";
export type CommentStatusFilter = CommentStatus | "suspended" | "all";

export type AdminComment = {
  id: string;
  body: string;
  status: CommentStatus;
  isAnonymous: boolean;
  authorName: string | null;
  userId: string | null;
  createdAt: string;
  moderationNote: string | null;
  user: { name: string | null } | null;
  section: {
    jwId: number | null;
    code: string | null;
    course: { jwId: number; code: string; nameCn: string } | null;
  } | null;
  course: {
    jwId: number;
    code: string;
    nameCn: string;
  } | null;
  teacher: { id: number; nameCn: string } | null;
  homework: {
    id: string;
    title: string;
    section: { code: string | null } | null;
  } | null;
  sectionTeacher: {
    section: {
      jwId: number | null;
      code: string | null;
      course: { jwId: number; code: string; nameCn: string } | null;
    } | null;
    teacher: { nameCn: string } | null;
  } | null;
};

export type AdminDescription = {
  id: string;
  content: string;
  lastEditedAt: string | null;
  updatedAt: string;
  lastEditedBy: { id: string; name: string | null } | null;
  section: {
    jwId: number | null;
    code: string | null;
    course: { jwId: number; code: string; nameCn: string } | null;
  } | null;
  course: { jwId: number; code: string; nameCn: string } | null;
  teacher: { id: number; nameCn: string } | null;
  homework: {
    id: string;
    title: string;
    section: {
      code: string | null;
      course: { jwId: number; code: string; nameCn: string } | null;
    } | null;
  } | null;
};

export type DescriptionContentFilter = "all" | "withContent" | "empty";
