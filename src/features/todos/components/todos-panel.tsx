import type { TodoItem } from "@/features/todos/components/todo-list";
import { TodoList } from "@/features/todos/components/todo-list";

type TodosPanelProps = {
  todos: TodoItem[];
};

export function TodosPanel({ todos }: TodosPanelProps) {
  return <TodoList todos={todos} />;
}
