import { type APIRequestContext, expect } from "@playwright/test";
import { DEV_SEED } from "../../../utils/dev-seed";

type ApiContractCase = {
  routePath: string;
};

async function findSectionByJwId(request: APIRequestContext) {
  const response = await request.post("/api/sections/match-codes", {
    data: { codes: [DEV_SEED.section.code] },
  });
  expect(response.status()).toBe(200);
  const body = (await response.json()) as {
    sections?: Array<{
      id?: number;
      jwId?: number | null;
      code?: string | null;
    }>;
  };
  const section = body.sections?.find(
    (entry) =>
      typeof entry.id === "number" &&
      typeof entry.code === "string" &&
      entry.code === DEV_SEED.section.code,
  );
  expect(section).toBeDefined();
  return section as { id: number; jwId: number | null; code: string };
}

export async function assertApiContract(
  request: APIRequestContext,
  { routePath }: ApiContractCase,
) {
  if (routePath === "/api/sections") {
    const response = await request.get("/api/sections?limit=20");
    expect(response.status()).toBe(200);
    const body = (await response.json()) as { data?: unknown[] };
    expect((body.data?.length ?? 0) > 0).toBe(true);
    const seedSection = await findSectionByJwId(request);
    expect(seedSection.code).toBe(DEV_SEED.section.code);
    return;
  }

  if (routePath === "/api/sections/[jwId]") {
    const response = await request.get(
      `/api/sections/${DEV_SEED.section.jwId}`,
    );
    expect(response.status()).toBe(200);
    const body = (await response.json()) as { jwId?: number; code?: string };
    expect(body.jwId).toBe(DEV_SEED.section.jwId);
    expect(body.code).toBe(DEV_SEED.section.code);
    return;
  }

  if (routePath === "/api/sections/[jwId]/schedules") {
    const response = await request.get(
      `/api/sections/${DEV_SEED.section.jwId}/schedules`,
    );
    expect(response.status()).toBe(200);
    const body = (await response.json()) as Array<{ id?: number }>;
    expect(body.length).toBeGreaterThan(0);
    return;
  }

  if (routePath === "/api/sections/[jwId]/schedule-groups") {
    const response = await request.get(
      `/api/sections/${DEV_SEED.section.jwId}/schedule-groups`,
    );
    expect(response.status()).toBe(200);
    const body = (await response.json()) as Array<{ schedules?: unknown[] }>;
    expect(body.length).toBeGreaterThan(0);
    return;
  }

  if (routePath === "/api/sections/[jwId]/calendar.ics") {
    const response = await request.get(
      `/api/sections/${DEV_SEED.section.jwId}/calendar.ics`,
    );
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/calendar");
    const text = await response.text();
    expect(text).toContain("BEGIN:VCALENDAR");
    return;
  }

  if (routePath === "/api/sections/calendar.ics") {
    const section = await findSectionByJwId(request);
    const response = await request.get(
      `/api/sections/calendar.ics?sectionIds=${section.id}`,
    );
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/calendar");
    const text = await response.text();
    expect(text).toContain("BEGIN:VCALENDAR");
    return;
  }

  if (routePath === "/api/sections/match-codes") {
    const response = await request.post("/api/sections/match-codes", {
      data: { codes: [DEV_SEED.section.code] },
    });
    expect(response.status()).toBe(200);
    const body = (await response.json()) as {
      matchedCodes?: string[];
      total?: number;
    };
    expect(body.matchedCodes?.includes(DEV_SEED.section.code)).toBe(true);
    expect((body.total ?? 0) > 0).toBe(true);
    return;
  }

  if (routePath === "/api/teachers") {
    const response = await request.get(
      `/api/teachers?search=${encodeURIComponent(DEV_SEED.teacher.nameCn)}`,
    );
    expect(response.status()).toBe(200);
    const body = (await response.json()) as {
      data?: Array<{ nameCn?: string }>;
    };
    expect(
      body.data?.some((entry) =>
        entry.nameCn?.includes(DEV_SEED.teacher.nameCn),
      ),
    ).toBe(true);
    return;
  }

  if (routePath === "/api/courses") {
    const response = await request.get(
      `/api/courses?search=${encodeURIComponent(DEV_SEED.course.code)}`,
    );
    expect(response.status()).toBe(200);
    const body = (await response.json()) as {
      data?: Array<{ jwId?: number | null; nameCn?: string }>;
    };
    expect(
      body.data?.some(
        (entry) =>
          entry.jwId === DEV_SEED.course.jwId &&
          entry.nameCn === DEV_SEED.course.nameCn,
      ),
    ).toBe(true);
    return;
  }

  if (routePath === "/api/schedules") {
    const section = await findSectionByJwId(request);
    const response = await request.get(
      `/api/schedules?sectionId=${section.id}`,
    );
    expect(response.status()).toBe(200);
    const body = (await response.json()) as { data?: unknown[] };
    expect((body.data?.length ?? 0) > 0).toBe(true);
    return;
  }

  if (routePath === "/api/semesters/current") {
    const response = await request.get("/api/semesters/current");
    expect(response.status()).toBe(200);
    const body = (await response.json()) as { jwId?: number; nameCn?: string };
    expect(body.jwId).toBe(DEV_SEED.semesterJwId);
    expect(typeof body.nameCn).toBe("string");
    return;
  }

  if (routePath === "/api/semesters") {
    const response = await request.get("/api/semesters?limit=20");
    expect(response.status()).toBe(200);
    const body = (await response.json()) as {
      data?: Array<{ jwId?: number }>;
    };
    expect(
      body.data?.some((entry) => entry.jwId === DEV_SEED.semesterJwId),
    ).toBe(true);
    return;
  }

  if (routePath === "/api/metadata") {
    const response = await request.get("/api/metadata");
    expect(response.status()).toBe(200);
    const body = (await response.json()) as { campuses?: unknown[] };
    expect((body.campuses?.length ?? 0) > 0).toBe(true);
    return;
  }

  if (routePath === "/api/comments") {
    const section = await findSectionByJwId(request);
    const response = await request.get(
      `/api/comments?targetType=section&targetId=${section.id}`,
    );
    expect(response.status()).toBe(200);
    const body = (await response.json()) as {
      comments?: Array<{ body?: string }>;
    };
    expect(
      body.comments?.some((entry) =>
        entry.body?.includes(DEV_SEED.comments.sectionRootBody),
      ),
    ).toBe(true);
    return;
  }

  if (routePath === "/api/descriptions") {
    const section = await findSectionByJwId(request);
    const response = await request.get(
      `/api/descriptions?targetType=section&targetId=${section.id}`,
    );
    expect(response.status()).toBe(200);
    const body = (await response.json()) as {
      description?: { content?: string };
    };
    expect(body.description?.content).toContain("课程建议");
    return;
  }

  if (
    routePath === "/api/homeworks" ||
    routePath === "/api/homeworks/[id]" ||
    routePath === "/api/homeworks/[id]/completion" ||
    routePath === "/api/uploads" ||
    routePath === "/api/uploads/[id]" ||
    routePath === "/api/uploads/[id]/download" ||
    routePath === "/api/uploads/complete" ||
    routePath === "/api/calendar-subscriptions" ||
    routePath === "/api/calendar-subscriptions/current" ||
    routePath === "/api/admin/comments" ||
    routePath === "/api/admin/comments/[id]" ||
    routePath === "/api/admin/users" ||
    routePath === "/api/admin/users/[id]" ||
    routePath === "/api/admin/suspensions" ||
    routePath === "/api/admin/suspensions/[id]"
  ) {
    const probePath = routePath
      .replace("[id]", "invalid-e2e")
      .replace("[jwId]", String(DEV_SEED.section.jwId));
    const response = await request.get(probePath);
    expect(response.status()).toBeGreaterThan(0);
    expect(response.status()).toBeLessThan(500);
    expect([400, 401, 403, 404, 405]).toContain(response.status());
    return;
  }

  if (routePath === "/api/openapi") {
    const response = await request.get("/api/openapi");
    expect(response.status()).toBe(200);
    const body = (await response.json()) as { openapi?: string };
    expect(body.openapi).toBe("3.0.0");
    return;
  }

  if (routePath === "/api/locale") {
    const response = await request.post("/api/locale", {
      data: { locale: "zh-cn" },
    });
    expect(response.status()).toBe(200);
    expect(response.headers()["set-cookie"]).toContain("NEXT_LOCALE=zh-cn");
    return;
  }

  if (routePath === "/api/auth/[...nextauth]") {
    const response = await request.get("/api/auth/session");
    expect(response.status()).toBe(200);
    return;
  }

  if (
    routePath === "/api/calendar-subscriptions/[id]" ||
    routePath === "/api/calendar-subscriptions/[id]/calendar.ics" ||
    routePath === "/api/comments/[id]" ||
    routePath === "/api/comments/[id]/reactions"
  ) {
    const response = await request.get(
      routePath.replace("[id]", "invalid-e2e"),
    );
    expect(response.status()).toBeGreaterThan(0);
    expect(response.status()).toBeLessThan(500);
    return;
  }

  const fallbackPath = routePath
    .replace("[id]", "invalid-e2e")
    .replace("[jwId]", "invalid-e2e")
    .replace("[...nextauth]", "session");
  const fallbackResponse = await request.get(fallbackPath);
  expect(fallbackResponse.status()).toBeGreaterThan(0);
  expect(fallbackResponse.status()).toBeLessThan(500);
}
