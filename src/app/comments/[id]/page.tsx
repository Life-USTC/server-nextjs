import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

const prismaAny = prisma as typeof prisma & { comment: any };

export default async function CommentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const comment = await prismaAny.comment.findUnique({
    where: { id },
    include: {
      homework: {
        include: {
          section: true,
        },
      },
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
