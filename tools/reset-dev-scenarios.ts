import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const SCENARIO_MARKER = "[DEV-SCENARIO]";
const debugUsername =
  process.env.DEV_DEBUG_USERNAME?.trim().toLowerCase() || "dev-user";

const SEMESTER_JW_ID = 990_000_1;
const COURSE_JW_ID = 990_100_1;
const SECTION_JW_ID = 990_200_1;
const TEACHER_CODE = "DEV-T-001";

async function main() {
  const user = await prisma.user.findUnique({
    where: { username: debugUsername },
    select: { id: true },
  });

  if (user) {
    await prisma.comment.deleteMany({
      where: {
        OR: [
          { body: { contains: SCENARIO_MARKER } },
          { userId: user.id, body: { contains: SCENARIO_MARKER } },
        ],
      },
    });

    await prisma.upload.deleteMany({
      where: {
        OR: [
          { key: { startsWith: "dev-scenario/" } },
          { userId: user.id, key: { startsWith: "dev-scenario/" } },
        ],
      },
    });

    const homeworks = await prisma.homework.findMany({
      where: {
        OR: [
          { title: { contains: SCENARIO_MARKER } },
          { section: { jwId: SECTION_JW_ID } },
        ],
      },
      select: { id: true },
    });

    if (homeworks.length > 0) {
      const homeworkIds = homeworks.map((item) => item.id);
      await prisma.homeworkCompletion.deleteMany({
        where: { homeworkId: { in: homeworkIds } },
      });
      await prisma.homework.deleteMany({
        where: { id: { in: homeworkIds } },
      });
    }
  }

  const section = await prisma.section.findUnique({
    where: { jwId: SECTION_JW_ID },
    select: { id: true },
  });

  if (section) {
    const subscriptions = await prisma.calendarSubscription.findMany({
      where: { sections: { some: { id: section.id } } },
      select: { id: true },
    });

    await Promise.all(
      subscriptions.map((subscription) =>
        prisma.calendarSubscription.update({
          where: { id: subscription.id },
          data: {
            sections: {
              disconnect: [{ id: section.id }],
            },
          },
        }),
      ),
    );

    await prisma.schedule.deleteMany({ where: { sectionId: section.id } });
    await prisma.scheduleGroup.deleteMany({ where: { sectionId: section.id } });
    await prisma.section.delete({ where: { id: section.id } });
  }

  await prisma.teacher.deleteMany({ where: { code: TEACHER_CODE } });
  await prisma.course.deleteMany({ where: { jwId: COURSE_JW_ID } });
  await prisma.semester.deleteMany({ where: { jwId: SEMESTER_JW_ID } });

  console.log("[DEV-SCENARIO] 已清理调试场景数据");
}

main()
  .catch((error: unknown) => {
    const err = error as Error;
    console.error("[DEV-SCENARIO] 清理失败", err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
