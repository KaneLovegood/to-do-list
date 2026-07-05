"use client";

import Image from "next/image";
import { FormEvent, useMemo, useRef, useState } from "react";
import Calendar from "@/components/Calendar";
import TodoCard from "@/components/TodoCard";
import type { Todo } from "@/types/todo";
import styles from "./TodoDashboard.module.css";

type Filter = "all" | "pending" | "completed";

type SelectedImage = {
  id: string;
  file: File;
  previewUrl: string;
};

type TodoDashboardProps = {
  initialTodos: Todo[];
};

type TodoResponse = {
  todo?: Todo;
  message?: string | string[];
};

const avatars = ["member-1", "member-2", "member-3", "member-4"];

function getTodayString() {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function errorMessage(payload: TodoResponse, fallback: string) {
  if (Array.isArray(payload.message)) return payload.message.join(" ");
  return payload.message || fallback;
}

export default function TodoDashboard({ initialTodos }: TodoDashboardProps) {
  const [todos, setTodos] = useState(initialTodos);
  const [selectedDate, setSelectedDate] = useState(getTodayString);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(4);
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formStartDate, setFormStartDate] = useState(selectedDate);
  const [formDeadline, setFormDeadline] = useState("");
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newImages = Array.from(files).map((file) => ({
        id: Math.random().toString(36).substring(2, 9),
        file,
        previewUrl: URL.createObjectURL(file),
      }));
      setSelectedImages((current) => [...current, ...newImages]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeSelectedImage = (id: string) => {
    setSelectedImages((current) => {
      const toRemove = current.find((img) => img.id === id);
      if (toRemove) {
        URL.revokeObjectURL(toRemove.previewUrl);
      }
      return current.filter((img) => img.id !== id);
    });
  };

  const selected = new Date(`${selectedDate}T12:00:00`);
  const completedCount = todos.reduce((count, todo) => count + Number(todo.completed), 0);
  const pendingCount = todos.length - completedCount;

  const filteredTodos = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return todos.filter((todo) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "completed" && todo.completed) ||
        (filter === "pending" && !todo.completed);
      const matchesQuery =
        !normalizedQuery ||
        todo.title.toLowerCase().includes(normalizedQuery) ||
        todo.description.toLowerCase().includes(normalizedQuery);

      return matchesFilter && matchesQuery;
    });
  }, [filter, query, todos]);

  const openAddModal = () => {
    setFormStartDate(selectedDate);
    setFormDeadline("");
    selectedImages.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    setSelectedImages([]);
    setIsAdding(true);
  };

  const closeAddModal = () => {
    if (isSubmitting) return;
    selectedImages.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    setSelectedImages([]);
    setIsAdding(false);
  };

  const addTodo = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const form = event.currentTarget;
    const formData = new FormData(form);

    formData.delete("image");
    selectedImages.forEach((img) => {
      formData.append("images", img.file);
    });

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/todos", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as TodoResponse;

      if (!response.ok || !payload.todo) {
        setError(errorMessage(payload, "Could not add the task."));
        return;
      }

      setTodos((current) => [payload.todo as Todo, ...current]);
      setIsAdding(false);
      selectedImages.forEach((img) => URL.revokeObjectURL(img.previewUrl));
      setSelectedImages([]);
      setVisibleCount((count) => Math.max(count, 4));
      form.reset();
    } catch {
      setError("Could not reach the todo API.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTodo = async (todo: Todo) => {
    setBusyId(todo.id);
    setError("");

    try {
      const response = await fetch(`/api/todos/${todo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !todo.completed }),
      });
      const payload = (await response.json()) as TodoResponse;

      if (response.ok && payload.todo) {
        setTodos((current) => current.map((item) => (item.id === todo.id ? payload.todo as Todo : item)));
      } else {
        setError(errorMessage(payload, "Could not update the task."));
      }
    } catch {
      setError("Could not reach the todo API.");
    } finally {
      setBusyId(null);
    }
  };

  const deleteTodo = async (todo: Todo) => {
    setBusyId(todo.id);
    setError("");

    try {
      const response = await fetch(`/api/todos/${todo.id}`, { method: "DELETE" });

      if (response.ok) {
        setTodos((current) => current.filter((item) => item.id !== todo.id));
      } else {
        const payload = (await response.json()) as TodoResponse;
        setError(errorMessage(payload, "Could not delete the task."));
      }
    } catch {
      setError("Could not reach the todo API.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className={styles.dashboard}>
      <div className={styles.dateRail}>
        <p className={styles.dayName} suppressHydrationWarning>{selected.toLocaleDateString("en-US", { weekday: "long" })}</p>
        <p className={styles.fullDate} suppressHydrationWarning>
          {selected.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}
        </p>
        <Calendar value={selectedDate} onChange={setSelectedDate} />
      </div>

      <div className={styles.tasksArea}>
        <div className={styles.toolbar}>
          <select value={filter} onChange={(event) => setFilter(event.target.value as Filter)} aria-label="Filter tasks">
            <option value="all">All tasks</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>
          <label className={styles.searchBox}>
            <span className="sr-only">Search tasks</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name" />
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></svg>
          </label>
          <button className={styles.addButton} type="button" onClick={openAddModal} aria-label="Add task">+</button>
        </div>

        <div className={styles.taskGrid} aria-live="polite">
          {filteredTodos.slice(0, visibleCount).map((todo) => (
            <TodoCard key={todo.id} todo={todo} busy={busyId === todo.id} onToggle={toggleTodo} onDelete={deleteTodo} />
          ))}
          {filteredTodos.length === 0 ? <p className={styles.empty}>No tasks match this view.</p> : null}
        </div>

        {filteredTodos.length > visibleCount ? (
          <button className={styles.loadMore} type="button" onClick={() => setVisibleCount((count) => count + 4)}>Load more</button>
        ) : null}
      </div>

      <div className={styles.summary}>
        <article className={`${styles.statCard} ${styles.completed}`}><span>Completed<br />tasks</span><strong>{String(completedCount).padStart(2, "0")}</strong></article>
        <article className={`${styles.statCard} ${styles.pending}`}><span>Pending<br />tasks</span><strong>{String(pendingCount).padStart(2, "0")}</strong></article>
        <article className={`${styles.statCard} ${styles.created}`}><span>Tasks created</span><strong>1,500</strong></article>
        <article className={`${styles.statCard} ${styles.users}`}>
          <span><strong>25K+</strong> Active Users</span>
          <div className={styles.avatars}>
            {avatars.map((avatar, index) => <Image key={avatar} src={`/avatars/${avatar}.png`} alt={`Active user ${index + 1}`} width={38} height={38} />)}
          </div>
        </article>
      </div>

      {error ? <p className={styles.error} role="alert">{error}</p> : null}

      {isAdding ? (
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={closeAddModal}>
          <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="add-task-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className={styles.modalHeader}><h2 id="add-task-title">Add a new task</h2><button type="button" onClick={closeAddModal} aria-label="Close">×</button></div>
            <form onSubmit={addTodo}>
              <label>Task name<input name="title" maxLength={120} autoFocus required /></label>
              <label>Description<textarea name="description" maxLength={500} rows={3} /></label>
              <div className={styles.formRow}>
                <label>From<input name="startDate" type="date" value={formStartDate} onChange={(event) => setFormStartDate(event.target.value)} required /></label>
                <label>To (Optional)<input name="deadline" type="date" min={formStartDate} value={formDeadline} onChange={(event) => setFormDeadline(event.target.value)} /></label>
              </div>
              <div className={styles.imageUploadStand}>
                <span className={styles.imageUploadStandText}>Task images</span>
                <label aria-label="Choose images">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0-2-.9-2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                  </svg>
                  <input
                    ref={fileInputRef}
                    name="image"
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleImageChange}
                    style={{ display: "none" }}
                  />
                </label>
              </div>
              {selectedImages.length > 0 ? (
                <div className={styles.imagesPreviewContainer}>
                  {selectedImages.map((img) => (
                    <div key={img.id} className={styles.imagePreview}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.previewUrl} alt="Preview of selected task image" />
                      <button
                        type="button"
                        onClick={() => removeSelectedImage(img.id)}
                        className={styles.removeImageBtn}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
              <button type="submit" disabled={isSubmitting}>{isSubmitting ? "Creating..." : "Create task"}</button>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
