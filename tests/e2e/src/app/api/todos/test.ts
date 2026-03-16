import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../../utils/auth";
import { DEV_SEED } from "../../../../utils/dev-seed";
import { assertApiContract } from "../../_shared/api-contract";

test("/api/todos", async ({ request }) => {
  await assertApiContract(request, { routePath: "/api/todos" });
});

test("/api/todos 登录后可返回 seed 待办", async ({ page }) => {
  await signInAsDebugUser(page, "/");

  const response = await page.request.get("/api/todos");
  expect(response.status()).toBe(200);
  const body = (await response.json()) as {
    todos?: Array<{ title?: string; completed?: boolean }>;
  };
  expect(
    body.todos?.some(
      (todo) =>
        todo.title === DEV_SEED.todos.dueTodayTitle && todo.completed === false,
    ),
  ).toBe(true);
});

test("/api/todos 登录后可创建新待办", async ({ page }) => {
  await signInAsDebugUser(page, "/");

  const title = `e2e-api-todo-${Date.now()}`;
  const createResponse = await page.request.post("/api/todos", {
    data: {
      title,
      content: "from api test",
      priority: "high",
    },
  });
  expect(createResponse.status()).toBe(200);

  const createdId = ((await createResponse.json()) as { id?: string }).id;
  expect(createdId).toBeTruthy();

  try {
    const listResponse = await page.request.get("/api/todos");
    expect(listResponse.status()).toBe(200);
    const listBody = (await listResponse.json()) as {
      todos?: Array<{ id?: string; title?: string; priority?: string }>;
    };
    expect(
      listBody.todos?.some(
        (todo) =>
          todo.id === createdId &&
          todo.title === title &&
          todo.priority === "high",
      ),
    ).toBe(true);
  } finally {
    if (createdId) {
      await page.request.delete(`/api/todos/${createdId}`);
    }
  }
});
