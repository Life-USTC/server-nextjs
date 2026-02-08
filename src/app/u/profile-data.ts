import dayjs from "dayjs";
import type { PrismaClient } from "@/generated/prisma/client";

type ContributionCell = {
  date: string;
  count: number;
};

type ProfileUser = {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
  createdAt: Date;
  _count: {
    comments: number;
    uploads: number;
    homeworksCreated: number;
  };
};

export type ProfileData = {
  user: ProfileUser;
  sectionCount: number;
  weeks: ContributionCell[][];
  totalContributions: number;
};

export async function fetchProfileData(
  prisma: PrismaClient,
  userId: string,
): Promise<ProfileData | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      createdAt: true,
      _count: {
        select: {
          comments: true,
          uploads: true,
          homeworksCreated: true,
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  const sectionSubscriptions = await prisma.calendarSubscription.findMany({
    where: { userId: user.id },
    select: {
      sections: {
        select: { id: true },
      },
    },
  });

  const sectionCount = new Set(
    sectionSubscriptions.flatMap(
      (subscription: { sections: { id: number }[] }) =>
        subscription.sections.map((section) => section.id),
    ),
  ).size;

  const today = dayjs().startOf("day");
  const startDate = today.subtract(364, "day").startOf("day");

  const [commentEvents, uploadEvents, completionEvents, homeworkCreatedEvents] =
    await Promise.all([
      prisma.comment.findMany({
        where: {
          userId: user.id,
          createdAt: { gte: startDate.toDate() },
          status: { in: ["active", "softbanned"] },
        },
        select: { createdAt: true },
      }),
      prisma.upload.findMany({
        where: {
          userId: user.id,
          createdAt: { gte: startDate.toDate() },
        },
        select: { createdAt: true },
      }),
      prisma.homeworkCompletion.findMany({
        where: {
          userId: user.id,
          completedAt: { gte: startDate.toDate() },
        },
        select: { completedAt: true },
      }),
      prisma.homework.findMany({
        where: {
          createdById: user.id,
          createdAt: { gte: startDate.toDate() },
          deletedAt: null,
        },
        select: { createdAt: true },
      }),
    ]);

  const contributionMap = new Map<string, number>();
  const addContribution = (value: Date) => {
    const key = dayjs(value).format("YYYY-MM-DD");
    contributionMap.set(key, (contributionMap.get(key) ?? 0) + 1);
  };

  for (const item of commentEvents) addContribution(item.createdAt);
  for (const item of uploadEvents) addContribution(item.createdAt);
  for (const item of completionEvents) addContribution(item.completedAt);
  for (const item of homeworkCreatedEvents) addContribution(item.createdAt);

  const gridStart = startDate.startOf("week");
  const gridEnd = today.endOf("week");
  const dayCount = gridEnd.diff(gridStart, "day") + 1;
  const days: ContributionCell[] = Array.from(
    { length: dayCount },
    (_, index) => {
      const date = gridStart.add(index, "day");
      const key = date.format("YYYY-MM-DD");
      return {
        date: key,
        count: contributionMap.get(key) ?? 0,
      };
    },
  );

  const weeks: ContributionCell[][] = [];
  for (let index = 0; index < days.length; index += 7) {
    weeks.push(days.slice(index, index + 7));
  }

  const totalContributions = Array.from(contributionMap.values()).reduce(
    (sum, value) => sum + value,
    0,
  );

  return {
    user: user as ProfileUser,
    sectionCount,
    weeks,
    totalContributions,
  };
}
