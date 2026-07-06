"use client";

import Image from "next/image";
import { MagnifyingGlass, Plus } from "@phosphor-icons/react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Calendar from "@/components/Calendar";
import TodoCard from "@/components/TodoCard";
import EditTodoModal from "@/components/EditTodoModal";
import type { Todo } from "@/types/todo";
import { useTodos } from "@/lib/todo-context";
import { useAuth } from "@/lib/auth-context";
import styles from "./TodoDashboard.module.css";

type Filter = "all" | "pending" | "completed";

function getTodayString() {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function TodoDashboard() {
  const {
    todos,
    isLoading: todosLoading,
    isSubmitting,
    addTodo,
    updateTodo,
    toggleTodo,
    deleteTodo,
    importGuestTodos,
  } = useTodos();

  const { user } = useAuth();

  const [selectedDate, setSelectedDate] = useState(getTodayString);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(4);
  const [isAdding, setIsAdding] = useState(false);
  const [formStartDate, setFormStartDate] = useState(selectedDate);
  const [formDeadline, setFormDeadline] = useState("");
  const [error, setError] = useState("");
  const [selectedImages, setSelectedImages] = useState<
    { file: File; previewUrl: string }[]
  >([]);

  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);

  // Migration states
  const [guestTodosToMigrate, setGuestTodosToMigrate] = useState<Todo[]>([]);
  const [showMigrationModal, setShowMigrationModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedImagesRef = useRef(selectedImages);

  useEffect(() => {
    selectedImagesRef.current = selectedImages;
  }, [selectedImages]);

  useEffect(() => {
    return () => {
      selectedImagesRef.current.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl));
    };
  }, []);

  // Check if guest todos exist in localStorage when user logs in
  useEffect(() => {
    if (user) {
      const localTodosStr = localStorage.getItem("todo_guest_todos");
      if (localTodosStr) {
        try {
          const localTodos = JSON.parse(localTodosStr) as Todo[];
          if (localTodos && localTodos.length > 0) {
            setTimeout(() => {
              setGuestTodosToMigrate(localTodos);
              setShowMigrationModal(true);
            }, 0);
          }
        } catch (e) {
          console.error("Error reading guest todos for migration:", e);
        }
      }
    }
  }, [user]);

  const handleMigrationAccept = async () => {
    setError("");
    const result = await importGuestTodos(guestTodosToMigrate);
    if (result.success) {
      setShowMigrationModal(false);
      setGuestTodosToMigrate([]);
    } else {
      setError(result.error || "Failed to import guest tasks.");
    }
  };

  const handleMigrationDecline = () => {
    // Keep authenticated account separate and clear guest tasks from localStorage
    const confirmClear = window.confirm(
      "Would you like to clear your guest tasks from local storage? Click Cancel to keep them on this device."
    );
    if (confirmClear) {
      localStorage.removeItem("todo_guest_todos");
    }
    setShowMigrationModal(false);
    setGuestTodosToMigrate([]);
  };

  const selected = new Date(`${selectedDate}T12:00:00`);
  const completedCount = todos.reduce((count, todo) => count + Number(todo.completed), 0);
  const pendingCount = todos.length - completedCount;
  const totalCount = todos.length;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

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
    setError("");
    setIsAdding(true);
  };

  const closeAddModal = () => {
    if (isSubmitting) return;
    setIsAdding(false);
    setSelectedImages((current) => {
      current.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl));
      return [];
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImageSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files?.length) {
      const newImages = Array.from(files).map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
      }));
      setSelectedImages((current) => {
        const combined = [...current, ...newImages];
        if (combined.length > 10) {
          const allowed = combined.slice(0, 10);
          const discarded = combined.slice(10);
          discarded.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl));
          return allowed;
        }
        return combined;
      });
      event.target.value = "";
    }
  };

  const removeSelectedImage = (indexToRemove: number) => {
    setSelectedImages((current) => {
      const imageToRemove = current[indexToRemove];
      if (imageToRemove) URL.revokeObjectURL(imageToRemove.previewUrl);
      return current.filter((_, index) => index !== indexToRemove);
    });
  };

  const handleAddTodo = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.delete("images");
    selectedImages.forEach(({ file }) => formData.append("images", file));

    const result = await addTodo(formData);
    if (result.success) {
      setIsAdding(false);
      setVisibleCount((count) => Math.max(count, 4));
      form.reset();
      setSelectedImages((current) => {
        current.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl));
        return [];
      });
    } else {
      setError(result.error || "Could not add the task.");
    }
  };

  const handleUpdateTodo = async (id: string, formData: FormData) => {
    return updateTodo(id, formData);
  };

  return (
    <section className={styles.dashboard}>
      <div className={styles.dateRail}>
        <p className={styles.dayName} suppressHydrationWarning>
          {selected.toLocaleDateString("en-US", { weekday: "long" })}
        </p>
        <p className={styles.fullDate} suppressHydrationWarning>
          {selected.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}
        </p>
        <Calendar value={selectedDate} onChange={setSelectedDate} />
      </div>

      <div className={styles.tasksArea}>
        <div className={styles.tasksHeader}>
          <h2>Your tasks</h2>
          <span>{filteredTodos.length} in this view</span>
        </div>
        <div className={styles.toolbar}>
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value as Filter)}
            aria-label="Filter tasks"
          >
            <option value="all">All tasks</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>
          <label className={styles.searchBox}>
            <span className="sr-only">Search tasks</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name"
            />
            <MagnifyingGlass size={20} weight="regular" aria-hidden="true" />
          </label>
          <button className={styles.addButton} type="button" onClick={openAddModal} aria-label="Add task">
            <Plus size={22} weight="bold" aria-hidden="true" />
          </button>
        </div>

        {todosLoading ? (
          <div className="flex items-center justify-center py-12 text-sm text-[#696563]">
            Loading tasks...
          </div>
        ) : (
          <div className={styles.taskGrid} aria-live="polite">
            {filteredTodos.slice(0, visibleCount).map((todo) => (
              <TodoCard
                key={todo.id}
                todo={todo}
                busy={false}
                onToggle={toggleTodo}
                onDelete={deleteTodo}
                onEdit={setEditingTodo}
              />
            ))}
            {filteredTodos.length === 0 ? <p className={styles.empty}>No tasks match this view.</p> : null}
          </div>
        )}

        {filteredTodos.length > visibleCount ? (
          <button
            className={styles.loadMore}
            type="button"
            onClick={() => setVisibleCount((count) => count + 4)}
          >
            Load more
          </button>
        ) : null}
      </div>

      <div className={styles.summary}>
        <article className={`${styles.statCard} ${styles.completed}`}>
          <span>
            Completed
            <br />
            tasks
          </span>
          <strong>{String(completedCount).padStart(2, "0")}</strong>
        </article>
        <article className={`${styles.statCard} ${styles.pending}`}>
          <span>
            Pending
            <br />
            tasks
          </span>
          <strong>{String(pendingCount).padStart(2, "0")}</strong>
        </article>

        <article className={`${styles.statCard} ${styles.progressCard}`}>
          <div className={styles.progressInfo}>
            <span>Progress</span>
            <strong>{completionRate}%</strong>
          </div>
          <div className={styles.progressBarWrapper}>
            <div className={styles.progressBarTrack}>
              <div className={styles.progressBarFill} style={{ width: `${completionRate}%` }} />
            </div>
            <span className={styles.progressSub}>
              {completedCount}/{totalCount} tasks
            </span>
          </div>
        </article>
      </div>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      {/* Add Task Modal */}
      {isAdding ? (
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={closeAddModal}>
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-task-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2 id="add-task-title">Add a new task</h2>
              <button type="button" onClick={closeAddModal} aria-label="Close">
                ×
              </button>
            </div>
            <form onSubmit={handleAddTodo}>
              <label>
                Task name
                <input name="title" maxLength={120} autoFocus required />
              </label>
              <label>
                Description
                <textarea name="description" maxLength={500} rows={3} />
              </label>
              <div className={styles.formRow}>
                <label>
                  From
                  <input
                    name="startDate"
                    type="date"
                    value={formStartDate}
                    onChange={(event) => setFormStartDate(event.target.value)}
                    required
                  />
                </label>
                <label>
                  To (Optional)
                  <input
                    name="deadline"
                    type="date"
                    min={formStartDate}
                    value={formDeadline}
                    onChange={(event) => setFormDeadline(event.target.value)}
                  />
                </label>
              </div>
              <label>
                Image URL (Optional)
                <input name="imageUrl" type="url" placeholder="https://example.com/image.jpg" />
              </label>
              <div className={styles.imageUploadStand}>
                <span className={styles.imageUploadStandText}>Task images</span>
                <label aria-label="Choose images">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0-2-.9-2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                  </svg>
                  <input
                    ref={fileInputRef}
                    name="images"
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleImageSelection}
                    style={{ display: "none" }}
                  />
                </label>
              </div>
              {selectedImages.length > 0 ? (
                <div className={styles.imagesPreviewContainer} aria-label="Selected image previews">
                  {selectedImages.map(({ file, previewUrl }, index) => (
                    <div className={styles.imagePreview} key={`${file.name}-${file.lastModified}-${index}`}>
                      {/* Blob URLs are local previews and cannot use the Next image optimizer. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={previewUrl} alt={`Preview of ${file.name}`} />
                      <button
                        className={styles.removeImageBtn}
                        type="button"
                        onClick={() => removeSelectedImage(index)}
                        aria-label={`Remove ${file.name}`}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
              <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create task"}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {/* Edit Task Modal */}
      {editingTodo ? (
        <EditTodoModal
          todo={editingTodo}
          onClose={() => setEditingTodo(null)}
          onUpdate={handleUpdateTodo}
        />
      ) : null}

      {/* Guest-to-User Migration Modal */}
      {showMigrationModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-[#faf7f2] border border-[#f2eaea] rounded-2xl shadow-2xl p-8 flex flex-col gap-6">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#f87777]"></div>

            <div className="flex flex-col items-center text-center gap-2">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-[#f2d3a2] text-[#11110f] font-semibold text-2xl mb-2">
                ⇄
              </div>
              <h3 className="text-xl font-bold text-[#11110f]">Import your guest tasks?</h3>
              <p className="text-sm text-[#696563]">
                We found {guestTodosToMigrate.length} tasks you created as a guest. Let&apos;s import them into your account so you can sync them online.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleMigrationAccept}
                className="w-full py-3 text-sm font-semibold text-white bg-[#f87777] hover:bg-[#f65a5a] rounded-xl shadow-md transition-all"
              >
                Yes, Import Tasks
              </button>
              <button
                onClick={handleMigrationDecline}
                className="w-full py-3 text-sm font-semibold text-[#11110f] bg-white border border-[#f2eaea] hover:bg-[#f2eaea]/30 rounded-xl transition-all"
              >
                No, Discard Them
              </button>
              <button
                onClick={() => setShowMigrationModal(false)}
                className="w-full py-3 text-sm font-semibold text-[#696563] hover:text-[#11110f] transition-all"
              >
                Keep Separate for Now
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
