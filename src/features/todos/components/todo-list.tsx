"use client";

import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Clock,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useOptimistic, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card";
import { CommentMarkdown } from "@/features/comments/components/comment-markdown";
import { cn } from "@/shared/lib/utils";
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

  const formatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }),
    [locale],
  );

  const filteredTodos = useMemo(() => {
    if (filter === "completed")
      return optimisticTodos.filter((t) => t.completed);
    if (filter === "incomplete")
      return optimisticTodos.filter((t) => !t.completed);
    return optimisticTodos;
  }, [filter, optimisticTodos]);

  const handleToggle = (todo: TodoItem) => {
    startTransition(async () => {
      const next = !todo.completed;
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-6">
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-md border border-border/70 p-1">
              <Button
                size="sm"
                variant={filter === "incomplete" ? "secondary" : "ghost"}
                onClick={() => setFilter("incomplete")}
              >
                {t("filterIncomplete")}
              </Button>
              <Button
                size="sm"
                variant={filter === "completed" ? "secondary" : "ghost"}
                onClick={() => setFilter("completed")}
              >
                {t("filterCompleted")}
              </Button>
              <Button
                size="sm"
                variant={filter === "all" ? "secondary" : "ghost"}
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
        </CardHeader>
      </div>

      {filteredTodos.length === 0 && (
        <div className="flex flex-col gap-6">
          <CardHeader>
            <CardTitle className="text-base">{t("filterEmptyTitle")}</CardTitle>
          </CardHeader>
        </div>
      )}

      {filteredTodos.map((todo) => {
        const Icon = PriorityIcon[todo.priority];
        const dueLabel = todo.dueAt
          ? formatter.format(new Date(todo.dueAt))
          : null;
        return (
          <Card
            key={todo.id}
            className={cn("border-border/60", todo.completed && "opacity-60")}
          >
            <CardHeader className="gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <button
                    type="button"
                    onClick={() => handleToggle(todo)}
                    aria-label={
                      todo.completed ? t("markIncomplete") : t("markComplete")
                    }
                    className="mt-0.5 shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {todo.completed ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <Circle className="h-5 w-5" />
                    )}
                  </button>
                  <div className="space-y-1">
                    <CardTitle
                      className={cn(
                        "text-base",
                        todo.completed && "text-muted-foreground line-through",
                      )}
                    >
                      {todo.title}
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={priorityVariant[todo.priority]}>
                        <Icon className="mr-1 h-3 w-3" />
                        {t(`priority.${todo.priority}`)}
                      </Badge>
                      {dueLabel && (
                        <span className="text-muted-foreground text-xs">
                          {t("dueLabel")} {dueLabel}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <CardAction>
                  <div className="flex items-center gap-1">
                    <TodoFormSheet
                      mode="edit"
                      todo={todo}
                      onSaved={() => router.refresh()}
                      triggerChildren={<Pencil className="h-4 w-4" />}
                      triggerVariant="ghost"
                      triggerSize="icon"
                      triggerAriaLabel={t("editAriaLabel")}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(todo.id)}
                      aria-label={t("deleteAriaLabel")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardAction>
              </div>
            </CardHeader>
            {todo.content && (
              <CardPanel>
                <div className="rounded-lg border border-border/60 bg-muted/5 px-3 py-3">
                  <CommentMarkdown content={todo.content} />
                </div>
              </CardPanel>
            )}
          </Card>
        );
      })}
    </div>
  );
}
