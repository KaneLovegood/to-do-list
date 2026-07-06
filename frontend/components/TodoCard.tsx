import Image from "next/image";
import { CheckSquare, PencilSimple, Square, Trash } from "@phosphor-icons/react";
import type { Todo } from "@/types/todo";

type TodoCardProps = {
  todo: Todo;
  busy: boolean;
  onToggle: (todo: Todo) => void;
  onDelete: (todo: Todo) => void;
  onEdit: (todo: Todo) => void;
};

export default function TodoCard({ todo, busy, onToggle, onDelete, onEdit }: TodoCardProps) {
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
          {todo.completed ? (
            <CheckSquare size={20} weight="fill" aria-hidden="true" />
          ) : (
            <Square size={20} weight="regular" aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          title="Edit task"
          aria-label={`Edit ${todo.title}`}
          disabled={busy}
          onClick={() => onEdit(todo)}
        >
          <PencilSimple size={20} weight="regular" aria-hidden="true" />
        </button>
        <button
          type="button"
          title="Delete task"
          aria-label={`Delete ${todo.title}`}
          disabled={busy}
          onClick={() => onDelete(todo)}
        >
          <Trash size={20} weight="regular" aria-hidden="true" />
        </button>
      </div>
      <p className="todo-card__dates">
        <span><strong>Start:</strong> {startDate}</span>
        <span><strong>Deadline:</strong> {deadline}</span>
      </p>
    </article>
  );
}
