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
    include: {
      sectionTeacher: {
        include: {
          section: true,
        },
      },
      section: true,
      course: true,
      teacher: true,
    },
  });

  if (!comment) {
    notFound();
  }

  const suffix = `#comment-${comment.id}`;
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
