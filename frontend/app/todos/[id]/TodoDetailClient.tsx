"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarBlank,
  CheckCircle,
  Circle,
  Clock,
  Images,
  PencilSimple,
  Trash,
} from "@phosphor-icons/react";
import { useState } from "react";
import AuthModal from "@/components/AuthModal";
import EditTodoModal from "@/components/EditTodoModal";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/auth-context";
import { useTodos } from "@/lib/todo-context";
import type { Todo } from "@/types/todo";
import styles from "./TodoDetail.module.css";

function formatDate(value: string | null, fallback: string) {
  if (!value) return fallback;

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function DetailSkeleton() {
  return (
    <main className={`${styles.detailMain} ${styles.loadingMain}`} aria-label="Loading task details">
      <div className={`${styles.skeleton} ${styles.loadingBack}`} />
      <div className={`${styles.skeleton} ${styles.loadingTitle}`} />
      <div className={`${styles.skeleton} ${styles.loadingPanel}`} />
    </main>
  );
}

function MissingTask({ signedOut }: { signedOut: boolean }) {
  return (
    <main className={styles.stateMain}>
      <section className={styles.statePanel}>
        <span className={styles.stateIcon} aria-hidden="true">
          <Circle size={28} weight="regular" />
        </span>
        <h1>{signedOut ? "Sign in to view this task" : "Task not found"}</h1>
        <p>
          {signedOut
            ? "Use the account or guest workspace that owns this task."
            : "This task may have been deleted or belongs to another workspace."}
        </p>
        <Link href="/" className={styles.stateLink}>
          Return to tasks
        </Link>
      </section>
    </main>
  );
}

function TodoDetails({ todo }: { todo: Todo }) {
  const router = useRouter();
  const { updateTodo, toggleTodo, deleteTodo } = useTodos();
  const [isEditing, setIsEditing] = useState(false);
  const [busyAction, setBusyAction] = useState<"toggle" | "delete" | null>(null);

  const images = Array.from(
    new Set(todo.imageUrls?.length ? todo.imageUrls : todo.imageUrl ? [todo.imageUrl] : []),
  );

  const handleToggle = async () => {
    setBusyAction("toggle");
    await toggleTodo(todo);
    setBusyAction(null);
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(`Delete "${todo.title}"? This cannot be undone.`);
    if (!confirmed) return;

    setBusyAction("delete");
    const result = await deleteTodo(todo);
    if (result.success) router.replace("/");
    else setBusyAction(null);
  };

  return (
    <>
      <main className={styles.detailMain}>
        <Link href="/" className={styles.backLink}>
          <ArrowLeft size={17} weight="bold" aria-hidden="true" />
          Back to tasks
        </Link>

        <header className={styles.detailHeader}>
          <div className={styles.titleGroup}>
            <span className={`${styles.status} ${todo.completed ? styles.statusComplete : ""}`}>
              {todo.completed ? (
                <CheckCircle size={17} weight="fill" aria-hidden="true" />
              ) : (
                <Circle size={17} weight="bold" aria-hidden="true" />
              )}
              {todo.completed ? "Completed" : "In progress"}
            </span>
            <h1>{todo.title}</h1>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.completeButton}
              onClick={handleToggle}
              disabled={busyAction !== null}
            >
              {todo.completed ? <Circle size={19} aria-hidden="true" /> : <CheckCircle size={19} aria-hidden="true" />}
              {busyAction === "toggle"
                ? "Updating..."
                : todo.completed
                  ? "Mark pending"
                  : "Mark complete"}
            </button>
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => setIsEditing(true)}
              disabled={busyAction !== null}
              aria-label={`Edit ${todo.title}`}
              title="Edit task"
            >
              <PencilSimple size={20} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={`${styles.iconButton} ${styles.deleteButton}`}
              onClick={handleDelete}
              disabled={busyAction !== null}
              aria-label={`Delete ${todo.title}`}
              title="Delete task"
            >
              <Trash size={20} aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className={styles.detailLayout}>
          <article className={styles.contentColumn}>
            {images.length > 0 ? (
              <section className={styles.imageSection} aria-labelledby="task-images-title">
                <div className={styles.sectionTitle}>
                  <Images size={20} aria-hidden="true" />
                  <h2 id="task-images-title">Images</h2>
                  <span>{images.length}</span>
                </div>
                <div className={`${styles.gallery} ${images.length > 1 ? styles.galleryMultiple : ""}`}>
                  {images.map((url, index) => (
                    <div className={styles.galleryImage} key={url}>
                      <Image
                        src={url}
                        alt={`${todo.title}, image ${index + 1}`}
                        fill
                        sizes={index === 0 ? "(max-width: 760px) 100vw, 680px" : "(max-width: 760px) 50vw, 330px"}
                        loading={index < 3 ? "eager" : "lazy"}
                      />
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <section className={styles.descriptionSection} aria-labelledby="description-title">
              <h2 id="description-title">Description</h2>
              <p className={todo.description ? "" : styles.mutedDescription}>
                {todo.description || "No description has been added to this task."}
              </p>
            </section>
          </article>

          <aside className={styles.metadata} aria-label="Task information">
            <h2>Task information</h2>
            <dl>
              <div>
                <dt><CalendarBlank size={18} aria-hidden="true" />Start date</dt>
                <dd>{formatDate(todo.startDate, "Not set")}</dd>
              </div>
              <div>
                <dt><CalendarBlank size={18} aria-hidden="true" />Deadline</dt>
                <dd>{formatDate(todo.deadline, "No deadline")}</dd>
              </div>
              <div>
                <dt><Clock size={18} aria-hidden="true" />Created</dt>
                <dd>{formatTimestamp(todo.createdAt)}</dd>
              </div>
              <div>
                <dt><Clock size={18} aria-hidden="true" />Last updated</dt>
                <dd>{formatTimestamp(todo.updatedAt)}</dd>
              </div>
            </dl>
          </aside>
        </div>
      </main>

      {isEditing ? (
        <EditTodoModal todo={todo} onClose={() => setIsEditing(false)} onUpdate={updateTodo} />
      ) : null}
    </>
  );
}

export default function TodoDetailClient({ todoId }: { todoId: string }) {
  const { user, isGuest, isLoading: authLoading } = useAuth();
  const { todos, isLoading: todosLoading } = useTodos();
  const hasWorkspace = Boolean(user) || isGuest;
  const todo = todos.find((item) => item.id === todoId);
  const isLoading = authLoading || (hasWorkspace && todosLoading);

  return (
    <div className="site-shell">
      <Navbar />
      {isLoading ? <DetailSkeleton /> : todo ? <TodoDetails todo={todo} /> : <MissingTask signedOut={!hasWorkspace} />}
      <Footer />
      {!authLoading && !hasWorkspace ? <AuthModal /> : null}
    </div>
  );
}
