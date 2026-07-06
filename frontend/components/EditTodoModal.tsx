"use client";

import { useEffect, useState, FormEvent, useRef } from "react";
import type { Todo } from "@/types/todo";
import styles from "./TodoDashboard.module.css";

type EditTodoModalProps = {
  todo: Todo;
  onClose: () => void;
  onUpdate: (id: string, formData: FormData) => Promise<{ success: boolean; error?: string }>;
};

export default function EditTodoModal({ todo, onClose, onUpdate }: EditTodoModalProps) {
  const [formStartDate, setFormStartDate] = useState(todo.startDate || "");
  const [formDeadline, setFormDeadline] = useState(todo.deadline || "");
  const [imageUrl, setImageUrl] = useState("");
  const [selectedImages, setSelectedImages] = useState<Array<{ file: File; previewUrl: string }>>([]);
  const [removeImage, setRemoveImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedImagesRef = useRef(selectedImages);
  const existingImageUrls = todo.imageUrls?.length
    ? todo.imageUrls
    : (todo.imageUrl ? [todo.imageUrl] : []);

  useEffect(() => {
    selectedImagesRef.current = selectedImages;
  }, [selectedImages]);

  useEffect(() => {
    return () => {
      selectedImagesRef.current.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl));
    };
  }, []);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files?.length) {
      const newImages = Array.from(files).map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
      }));
      setSelectedImages((current) => [...current, ...newImages]);
      setRemoveImage(false);
      event.target.value = "";
    }
  };

  const handleRemoveSelectedImage = (previewUrl: string) => {
    URL.revokeObjectURL(previewUrl);
    setSelectedImages((current) => current.filter((image) => image.previewUrl !== previewUrl));
  };

  const handleRemoveImage = () => {
    selectedImages.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl));
    setSelectedImages([]);
    setImageUrl("");
    setRemoveImage(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    if (!imageUrl) formData.delete("imageUrl");

    formData.delete("images");
    selectedImages.forEach(({ file }) => formData.append("images", file));

    formData.set("removeImage", String(removeImage));

    const result = await onUpdate(todo.id, formData);
    setIsSubmitting(false);

    if (result.success) {
      onClose();
    } else {
      setError(result.error || "Could not update the task.");
    }
  };

  return (
    <div className={styles.modalBackdrop} role="presentation" onMouseDown={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-task-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h2 id="edit-task-title">Edit task</h2>
          <button type="button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          {error && <p className={styles.error} role="alert">{error}</p>}

          <label>
            Task name
            <input name="title" defaultValue={todo.title} maxLength={120} required autoFocus />
          </label>

          <label>
            Description
            <textarea name="description" defaultValue={todo.description} maxLength={500} rows={3} />
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
            <input
              name="imageUrl"
              type="url"
              placeholder="https://example.com/image.jpg"
              value={imageUrl}
              onChange={(e) => {
                setImageUrl(e.target.value);
                if (e.target.value) setRemoveImage(false);
              }}
            />
          </label>

          <div className={styles.imageUploadStand}>
            <span className={styles.imageUploadStandText}>Add task images</span>
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
                onChange={handleImageChange}
                style={{ display: "none" }}
              />
            </label>
          </div>

          {(existingImageUrls.length > 0 || selectedImages.length > 0 || imageUrl) && !removeImage ? (
            <div className={styles.imagesPreviewContainer}>
              {existingImageUrls.map((url) => (
                <div className={styles.imagePreview} key={url}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="Existing task image" />
                </div>
              ))}
              {selectedImages.map(({ previewUrl }) => (
                <div className={styles.imagePreview} key={previewUrl}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="New task preview" />
                  <button type="button" onClick={() => handleRemoveSelectedImage(previewUrl)} className={styles.removeImageBtn}>
                    Remove
                  </button>
                </div>
              ))}
              {imageUrl ? (
                <div className={styles.imagePreview}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl} alt="New task image URL preview" />
                </div>
              ) : null}
              {(existingImageUrls.length > 0 || imageUrl) ? (
                <button type="button" onClick={handleRemoveImage} className={styles.removeImageBtn}>
                  Remove all images
                </button>
              ) : null}
            </div>
          ) : null}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
