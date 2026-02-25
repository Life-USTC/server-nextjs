import { expect, test } from "@playwright/test";
import { DEV_SEED } from "../../../../../utils/dev-seed";
import { assertApiContract } from "../../../_shared/api-contract";

test("/api/sections/match-codes", async ({ request }) => {
  await assertApiContract(request, { routePath: "/api/sections/match-codes" });
});

test("/api/sections/match-codes 返回 matched 与 unmatched", async ({
  request,
}) => {
  const unknownCode = "DEV-NOT-EXIST";
  const response = await request.post("/api/sections/match-codes", {
    data: { codes: [DEV_SEED.section.code, unknownCode] },
  });
  expect(response.status()).toBe(200);
  const body = (await response.json()) as {
    matchedCodes?: string[];
    unmatchedCodes?: string[];
  };
  expect(body.matchedCodes).toContain(DEV_SEED.section.code);
  expect(body.unmatchedCodes).toContain(unknownCode);
});
