import "server-only";
import type { Todo } from "@/types/todo";

const backendUrl = (process.env.BACKEND_URL ?? "http://localhost:3001").replace(/\/$/, "");

type TodosResponse = {
  todos: Todo[];
};

export async function getTodos(): Promise<Todo[]> {
  const response = await fetch(`${backendUrl}/api/todos`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Could not load todos (${response.status}).`);
  }

  const payload = (await response.json()) as TodosResponse;
  return payload.todos;
}
