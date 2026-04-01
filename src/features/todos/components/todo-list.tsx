"use client";

import { AlertCircle, Circle, Clock, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useOptimistic, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardPanel, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CommentMarkdown } from "@/features/comments/components/comment-markdown";
import { cn } from "@/lib/utils";
import { formatSmartDateTime } from "@/shared/lib/time-utils";
import { TodoFormSheet } from "./todo-form-sheet";

type TodoPriority = "low" | "medium" | "high";

export type TodoItem = {
  id: string;
  title: string;
  content: string | null;
  completed: boolean;
  priority: TodoPriority;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type TodoListProps = {
  todos: TodoItem[];
};

type TodoFilter = "all" | "incomplete" | "completed";

async function patchTodo(id: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/todos/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to update todo");
}

async function deleteTodoApi(id: string) {
  const res = await fetch(`/api/todos/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete todo");
}

export function TodoList({ todos }: TodoListProps) {
  const t = useTranslations("todos");
  const locale = useLocale();
  const router = useRouter();
  const [filter, setFilter] = useState<TodoFilter>("incomplete");
  const [, startTransition] = useTransition();
  const [optimisticTodos, updateOptimistic] = useOptimistic(
    todos,
    (
      state: TodoItem[],
      action:
        | { type: "toggle"; id: string; completed: boolean }
        | { type: "delete"; id: string }
        | { type: "add"; todo: TodoItem }
        | { type: "update"; todo: TodoItem },
    ) => {
      if (action.type === "toggle") {
        return state.map((t) =>
          t.id === action.id ? { ...t, completed: action.completed } : t,
        );
      }
      if (action.type === "delete") {
        return state.filter((t) => t.id !== action.id);
      }
      if (action.type === "add") {
        return [action.todo, ...state];
      }
      if (action.type === "update") {
        return state.map((t) => (t.id === action.todo.id ? action.todo : t));
      }
      return state;
    },
  );

  const filteredTodos = useMemo(() => {
    if (filter === "completed")
      return optimisticTodos.filter((t) => t.completed);
    if (filter === "incomplete")
      return optimisticTodos.filter((t) => !t.completed);
    return optimisticTodos;
  }, [filter, optimisticTodos]);
  const referenceNow = new Date();

  const handleToggle = (todo: TodoItem, nextCompleted?: boolean) => {
    startTransition(async () => {
      const next = nextCompleted ?? !todo.completed;
      updateOptimistic({ type: "toggle", id: todo.id, completed: next });
      try {
        await patchTodo(todo.id, { completed: next });
        router.refresh();
      } catch {
        // revert on error by refreshing
        router.refresh();
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      updateOptimistic({ type: "delete", id });
      try {
        await deleteTodoApi(id);
        router.refresh();
      } catch {
        router.refresh();
      }
    });
  };

  const priorityVariant: Record<
    TodoPriority,
    "destructive" | "warning" | "outline"
  > = {
    high: "destructive",
    medium: "warning",
    low: "outline",
  };

  const PriorityIcon: Record<TodoPriority, typeof AlertCircle> = {
    high: AlertCircle,
    medium: Clock,
    low: Circle,
  };
  const filterButtonClass = (active: boolean) =>
    cn(
      "rounded-lg px-3 py-1.5",
      active
        ? "bg-background text-foreground shadow-[0_1px_2px_rgba(15,23,42,0.06)]"
        : "text-muted-foreground hover:bg-background/70 hover:text-foreground",
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-card/72 p-1">
        <div className="inline-flex rounded-lg">
          <Button
            size="sm"
            variant="ghost"
            className={filterButtonClass(filter === "incomplete")}
            onClick={() => setFilter("incomplete")}
          >
            {t("filterIncomplete")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className={filterButtonClass(filter === "completed")}
            onClick={() => setFilter("completed")}
          >
            {t("filterCompleted")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className={filterButtonClass(filter === "all")}
            onClick={() => setFilter("all")}
          >
            {t("filterAll")}
          </Button>
        </div>
        <TodoFormSheet
          mode="create"
          onSaved={() => router.refresh()}
          triggerChildren={
            <>
              <Plus className="h-4 w-4" />
              {t("addButton")}
            </>
          }
        />
      </div>

      {filteredTodos.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{t("filterEmptyTitle")}</EmptyTitle>
            <EmptyDescription>{t("filterEmptyDescription")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filteredTodos.map((todo) => {
          const Icon = PriorityIcon[todo.priority];
          const dueLabel = todo.dueAt
            ? formatSmartDateTime(todo.dueAt, referenceNow, locale)
            : null;
          return (
            <Card
              key={todo.id}
              className={cn(
                "flex h-full min-h-0 flex-col rounded-xl border-border/70 bg-card/72",
                todo.completed && "opacity-60",
              )}
            >
              <CardPanel className="flex min-h-0 flex-1 flex-col gap-3">
                <CardTitle className="min-w-0 truncate font-medium text-base">
                  <TodoFormSheet
                    mode="edit"
                    todo={todo}
                    onSaved={() => router.refresh()}
                    onDelete={handleDelete}
                    triggerChildren={
                      <span
                        className={cn(
                          "block min-w-0 truncate text-left",
                          todo.completed &&
                            "text-muted-foreground line-through",
                        )}
                        title={todo.title}
                      >
                        {todo.title}
                      </span>
                    }
                    triggerVariant="ghost"
                    triggerSize="default"
                    triggerAriaLabel={t("editAriaLabel")}
                    triggerClassName="h-auto w-full justify-start px-0 font-medium text-base hover:bg-transparent"
                  />
                </CardTitle>
                {todo.content ? (
                  <div className="line-clamp-2 rounded-lg border border-border/50 bg-background/70 px-2.5 py-2 text-muted-foreground text-xs">
                    <CommentMarkdown content={todo.content} />
                  </div>
                ) : null}
                <div className="mt-auto space-y-2 text-sm">
                  {dueLabel ? (
                    <p className="font-semibold text-foreground tabular-nums">
                      {dueLabel}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant={priorityVariant[todo.priority]}
                        className="border-0 text-xs"
                      >
                        <Icon className="mr-0.5 h-3 w-3" />
                        {t(`priority.${todo.priority}`)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id={`todo-completed-${todo.id}`}
                        checked={todo.completed}
                        onCheckedChange={(checked) =>
                          void handleToggle(todo, checked)
                        }
                      />
                      <Label
                        htmlFor={`todo-completed-${todo.id}`}
                        className="sr-only"
                      >
                        {todo.completed
                          ? t("markIncomplete")
                          : t("markComplete")}
                      </Label>
                    </div>
                  </div>
                </div>
              </CardPanel>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
