import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  getPrisma: () => ({}),
  prisma: {
    semester: {},
    section: {},
    user: {},
  },
}));

let buildCourseListWhere: typeof import("@/lib/course-section-queries").buildCourseListWhere;
let buildSectionListQuery: typeof import("@/lib/course-section-queries").buildSectionListQuery;

beforeAll(async () => {
  const queries = await import("@/lib/course-section-queries");
  buildCourseListWhere = queries.buildCourseListWhere;
  buildSectionListQuery = queries.buildSectionListQuery;
});

describe("course and section query helpers", () => {
  it("builds course filters from search and numeric ids", () => {
    expect(
      buildCourseListWhere({
        search: "math",
        educationLevelId: "1",
        categoryId: "2",
        classTypeId: 3,
      }),
    ).toEqual({
      OR: [
        { nameCn: { contains: "math", mode: "insensitive" } },
        { nameEn: { contains: "math", mode: "insensitive" } },
        { code: { contains: "math", mode: "insensitive" } },
      ],
      educationLevelId: 1,
      categoryId: 2,
      classTypeId: 3,
    });
  });

  it("drops invalid course numeric filters", () => {
    expect(
      buildCourseListWhere({
        educationLevelId: "foo",
        categoryId: "",
        classTypeId: null,
      }),
    ).toBeUndefined();
  });

  it("builds section filters, ids, and parsed search order", () => {
    const result = buildSectionListQuery({
      courseId: "11",
      semesterId: 22,
      campusId: "33",
      departmentId: "44",
      teacherId: "55",
      ids: "1, 2, x, 3",
      search: "teacher:smith sort:semester order:desc linear algebra",
    });

    expect(result.where).toMatchObject({
      courseId: 11,
      semesterId: 22,
      campusId: 33,
      openDepartmentId: 44,
      teachers: {
        some: {
          id: 55,
        },
      },
      id: { in: [1, 2, 3] },
    });
    expect(result.where.AND).toEqual(
      expect.arrayContaining([
        {
          teachers: {
            some: {
              nameCn: {
                contains: "smith",
                mode: "insensitive",
              },
            },
          },
        },
        {
          OR: [
            {
              course: {
                nameCn: {
                  contains: "linear algebra",
                  mode: "insensitive",
                },
              },
            },
            {
              course: {
                nameEn: {
                  contains: "linear algebra",
                  mode: "insensitive",
                },
              },
            },
            {
              course: {
                code: {
                  contains: "linear algebra",
                  mode: "insensitive",
                },
              },
            },
            {
              code: {
                contains: "linear algebra",
                mode: "insensitive",
              },
            },
          ],
        },
      ]),
    );
    expect(result.orderBy).toEqual({ semester: { jwId: "desc" } });
  });

  it("accepts numeric id arrays for section filters", () => {
    expect(
      buildSectionListQuery({
        ids: [7, 8, 9],
      }).where,
    ).toEqual({
      id: {
        in: [7, 8, 9],
      },
    });
  });
});
