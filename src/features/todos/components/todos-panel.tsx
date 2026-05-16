import type { TodoItem } from "@/features/todos/components/todo-list";
import { TodoList } from "@/features/todos/components/todo-list";

type TodosPanelProps = {
  todos: TodoItem[];
  referenceNow?: string | null;
};

export function TodosPanel({ todos, referenceNow }: TodosPanelProps) {
  return <TodoList todos={todos} referenceNow={referenceNow} />;
}
