import { expect, test, type Page } from "@playwright/test";
import { signInAsDebugUser, signInAsDevAdmin } from "../../../../../utils/auth";
import { assertApiContract } from "../../../_shared/api-contract";

async function createTodo(page: Page, title: string) {
  const response = await page.request.post("/api/todos", {
    data: {
      title,
      priority: "medium",
    },
  });
  expect(response.status()).toBe(200);
  const id = ((await response.json()) as { id?: string }).id;
  expect(id).toBeTruthy();
  return id as string;
}

test("/api/todos/[id]", async ({ request }) => {
  await assertApiContract(request, { routePath: "/api/todos/[id]" });
});

test("/api/todos/[id] 登录后可更新待办", async ({ page }) => {
  await signInAsDebugUser(page, "/");
  const todoId = await createTodo(page, `e2e-api-todo-update-${Date.now()}`);

  try {
    const patchResponse = await page.request.patch(`/api/todos/${todoId}`, {
      data: {
        title: "updated todo title",
        completed: true,
      },
    });
    expect(patchResponse.status()).toBe(200);
    expect((await patchResponse.json()) as { success?: boolean }).toEqual({
      success: true,
    });

    const listResponse = await page.request.get("/api/todos");
    expect(listResponse.status()).toBe(200);
    const listBody = (await listResponse.json()) as {
      todos?: Array<{ id?: string; title?: string; completed?: boolean }>;
    };
    expect(
      listBody.todos?.some(
        (todo) =>
          todo.id === todoId &&
          todo.title === "updated todo title" &&
          todo.completed === true,
      ),
    ).toBe(true);
  } finally {
    await page.request.delete(`/api/todos/${todoId}`);
  }
});

test("/api/todos/[id] 非所有者不能修改待办", async ({ browser }) => {
  const debugPage = await browser.newPage();
  const adminPage = await browser.newPage();

  try {
    await signInAsDebugUser(debugPage, "/");
    const todoId = await createTodo(
      debugPage,
      `e2e-api-todo-forbidden-${Date.now()}`,
    );

    await signInAsDevAdmin(adminPage, "/");
    const patchResponse = await adminPage.request.patch(`/api/todos/${todoId}`, {
      data: {
        completed: true,
      },
    });
    expect(patchResponse.status()).toBe(403);

    await debugPage.request.delete(`/api/todos/${todoId}`);
  } finally {
    await debugPage.close();
    await adminPage.close();
  }
});

test("/api/todos/[id] 登录后可删除待办", async ({ page }) => {
  await signInAsDebugUser(page, "/");
  const todoId = await createTodo(page, `e2e-api-todo-delete-${Date.now()}`);

  const deleteResponse = await page.request.delete(`/api/todos/${todoId}`);
  expect(deleteResponse.status()).toBe(200);
  expect((await deleteResponse.json()) as { success?: boolean }).toEqual({
    success: true,
  });

  const listResponse = await page.request.get("/api/todos");
  expect(listResponse.status()).toBe(200);
  const listBody = (await listResponse.json()) as {
    todos?: Array<{ id?: string }>;
  };
  expect(listBody.todos?.some((todo) => todo.id === todoId)).toBe(false);
});
