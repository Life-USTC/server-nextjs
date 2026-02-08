import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function CommentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const comment = await prisma.comment.findUnique({
    where: { id },
    select: {
      id: true,
      homework: { select: { id: true, section: { select: { jwId: true } } } },
      sectionTeacher: { select: { section: { select: { jwId: true } } } },
      section: { select: { jwId: true } },
      course: { select: { jwId: true } },
      teacher: { select: { id: true } },
    },
  });

  if (!comment) {
    notFound();
  }

  const suffix = `#comment-${comment.id}`;
  if (comment.homework?.section?.jwId) {
    redirect(
      `/sections/${comment.homework.section.jwId}#homework-${comment.homework.id}`,
    );
  }
  if (comment.sectionTeacher?.section?.jwId) {
    redirect(`/sections/${comment.sectionTeacher.section.jwId}${suffix}`);
  }
  if (comment.section?.jwId) {
    redirect(`/sections/${comment.section.jwId}${suffix}`);
  }
  if (comment.course?.jwId) {
    redirect(`/courses/${comment.course.jwId}${suffix}`);
  }
  if (comment.teacher?.id) {
    redirect(`/teachers/${comment.teacher.id}${suffix}`);
  }

  notFound();
}
