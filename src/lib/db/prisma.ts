import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@/generated/prisma/client";

const connectionString = `${process.env.DATABASE_URL}`;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const normalizeName = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const getNamePrimary = (
  locale: string,
  nameCn: string,
  nameEn?: string | null,
) => {
  const english = normalizeName(nameEn);
  if (locale === "en-us" && english) {
    return english;
  }
  return nameCn;
};

const getNameSecondary = (
  locale: string,
  nameCn: string,
  nameEn?: string | null,
) => {
  const english = normalizeName(nameEn);
  if (locale === "en-us") {
    return english ? nameCn : null;
  }
  return english;
};

const localizedNameResult = (locale: string) => ({
  namePrimary: {
    needs: { nameCn: true, nameEn: true },
    compute: ({ nameCn, nameEn }: { nameCn: string; nameEn?: string | null }) =>
      getNamePrimary(locale, nameCn, nameEn),
  },
  nameSecondary: {
    needs: { nameCn: true, nameEn: true },
    compute: ({ nameCn, nameEn }: { nameCn: string; nameEn?: string | null }) =>
      getNameSecondary(locale, nameCn, nameEn),
  },
});

const localizedNamesExtension = (locale: string) =>
  Prisma.defineExtension({
    name: "localizedNames",
    result: {
      adminClass: localizedNameResult(locale),
      building: localizedNameResult(locale),
      campus: localizedNameResult(locale),
      classType: localizedNameResult(locale),
      course: localizedNameResult(locale),
      courseCategory: localizedNameResult(locale),
      courseClassify: localizedNameResult(locale),
      courseGradation: localizedNameResult(locale),
      courseType: localizedNameResult(locale),
      department: localizedNameResult(locale),
      educationLevel: localizedNameResult(locale),
      examBatch: localizedNameResult(locale),
      examMode: localizedNameResult(locale),
      room: localizedNameResult(locale),
      roomType: localizedNameResult(locale),
      teacher: localizedNameResult(locale),
      teacherLessonType: localizedNameResult(locale),
      teacherTitle: localizedNameResult(locale),
      teachLanguage: localizedNameResult(locale),
    },
  });

export const adapter = new PrismaPg({ connectionString });
export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

const _makeExtendedClient = (locale: string) =>
  prisma.$extends(localizedNamesExtension(locale));

type ExtendedPrismaClient = ReturnType<typeof _makeExtendedClient>;

const extendedClientCache = new Map<string, ExtendedPrismaClient>();

export const getPrisma = (locale: string): ExtendedPrismaClient => {
  const cached = extendedClientCache.get(locale);
  if (cached) return cached;
  const extended = _makeExtendedClient(locale);
  extendedClientCache.set(locale, extended);
  return extended;
};

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
