import Image from "next/image";
import type { Todo } from "@/types/todo";

type TodoCardProps = {
  todo: Todo;
  busy: boolean;
  onToggle: (todo: Todo) => void;
  onDelete: (todo: Todo) => void;
};

function CheckIcon({ checked = false }: { checked?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      {checked ? <path d="m8 12 3 3 5-6" /> : null}
    </svg>
  );
}

export default function TodoCard({ todo, busy, onToggle, onDelete }: TodoCardProps) {
  const startDate = todo.startDate
    ? new Date(`${todo.startDate}T12:00:00`).toLocaleDateString("en-GB")
    : "Not set";
  const deadline = todo.deadline
    ? new Date(`${todo.deadline}T12:00:00`).toLocaleDateString("en-GB")
    : "No deadline";

  const imagesToShow = todo.imageUrls && todo.imageUrls.length > 0
    ? todo.imageUrls
    : (todo.imageUrl ? [todo.imageUrl] : []);

  const maxImages = 2;
  const hasMore = imagesToShow.length > maxImages;
  const displayedImages = hasMore ? imagesToShow.slice(0, maxImages - 1) : imagesToShow;
  const remainingCount = imagesToShow.length - displayedImages.length;

  return (
    <article className={`todo-card ${todo.completed ? "is-complete" : ""}`}>
      <div className="todo-card__content">
        {imagesToShow.length > 0 ? (
          <div className="todo-card__images-container">
            {displayedImages.map((url, idx) => (
              <div key={idx} className="todo-card__image">
                <Image
                  src={url}
                  alt={`Image ${idx + 1} for ${todo.title}`}
                  fill
                  sizes="(max-width: 640px) 32px, 58px"
                />
              </div>
            ))}
            {hasMore ? (
              <div className="todo-card__image todo-card__image--more">
                <Image
                  src={imagesToShow[maxImages - 1]}
                  alt={`Additional image for ${todo.title}`}
                  fill
                  sizes="(max-width: 640px) 32px, 58px"
                />
                <div className="todo-card__image-overlay">
                  <span>+{remainingCount}</span>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="todo-card__copy">
          <h3>{todo.title}</h3>
          <p>{todo.description || "Keep moving this task forward."}</p>
        </div>
      </div>
      <div className="todo-card__actions">
        <button
          type="button"
          title={todo.completed ? "Mark as pending" : "Mark as complete"}
          aria-label={todo.completed ? `Mark ${todo.title} as pending` : `Mark ${todo.title} as complete`}
          disabled={busy}
          onClick={() => onToggle(todo)}
        >
          <CheckIcon checked={todo.completed} />
        </button>
        <button
          type="button"
          title="Delete task"
          aria-label={`Delete ${todo.title}`}
          disabled={busy}
          onClick={() => onDelete(todo)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 7h14M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5" />
          </svg>
        </button>
      </div>
      <p className="todo-card__dates">
        <span><strong>Start:</strong> {startDate}</span>
        <span><strong>Deadline:</strong> {deadline}</span>
      </p>
    </article>
  );
}
