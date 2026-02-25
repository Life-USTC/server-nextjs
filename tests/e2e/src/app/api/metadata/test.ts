import { expect, test } from "@playwright/test";
import { DEV_SEED } from "../../../../utils/dev-seed";
import { assertApiContract } from "../../_shared/api-contract";

test("/api/metadata", async ({ request }) => {
  await assertApiContract(request, { routePath: "/api/metadata" });
});

test("/api/metadata 返回 seed 元数据字典", async ({ request }) => {
  const response = await request.get("/api/metadata");
  expect(response.status()).toBe(200);

  const body = (await response.json()) as {
    teachLanguages?: Array<{ nameCn?: string }>;
    courseClassifies?: Array<{ nameCn?: string }>;
    campuses?: Array<{
      nameCn?: string;
      buildings?: Array<{ nameCn?: string }>;
    }>;
  };

  expect(
    body.teachLanguages?.some(
      (item) => item.nameCn === DEV_SEED.metadata.teachLanguageNameCn,
    ),
  ).toBe(true);
  expect(
    body.courseClassifies?.some(
      (item) => item.nameCn === DEV_SEED.metadata.courseClassifyNameCn,
    ),
  ).toBe(true);

  const campus = body.campuses?.find(
    (item) => item.nameCn === DEV_SEED.metadata.campusNameCn,
  );
  expect(campus).toBeDefined();
  expect(
    campus?.buildings?.some(
      (building) => building.nameCn === DEV_SEED.metadata.buildingNameCn,
    ),
  ).toBe(true);
});
