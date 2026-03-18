"use client";

import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import type { CalendarTodoItem } from "@/app/dashboard/dashboard-data";
import { CalendarEventCardInteractive } from "@/components/calendar-event-card-interactive";

export function CalendarDayTodoCards({ todos }: { todos: CalendarTodoItem[] }) {
  const t = useTranslations("todos");

  const compactText = (raw: string) =>
    raw.replace(/\s+/g, " ").trim().slice(0, 120);

  return (
    <>
      {todos.map((todo) => {
        const due = dayjs(todo.dueAt);
        const timeStr = due.format("HH:mm");
        const timeLine = `${t("dueLabel")} ${timeStr}`;
        const priorityLabel = t(`priority.${todo.priority}`);
        const content = todo.content?.trim() ? compactText(todo.content) : null;
        return (
          <CalendarEventCardInteractive
            key={`todo-${todo.id}`}
            href="/?tab=todos"
            variant="todo"
            title={todo.title}
            time={timeLine}
            details={[
              {
                label: t("dueAtLabel"),
                value: `${due.format("YYYY-MM-DD")} ${timeStr}`,
              },
              { label: t("priorityLabel"), value: priorityLabel },
              ...(content
                ? [{ label: t("contentLabel"), value: content }]
                : []),
            ]}
          />
        );
      })}
    </>
  );
}
