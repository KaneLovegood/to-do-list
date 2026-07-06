import type { Metadata } from "next";
import TodoDetailClient from "./TodoDetailClient";

export const metadata: Metadata = {
  title: "Task details | Todo planner",
  description: "Review and update a task in Todo planner.",
};

export default async function TodoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <TodoDetailClient todoId={id} />;
}
