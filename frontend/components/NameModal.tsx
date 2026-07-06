"use client";

import { FormEvent, useId, useState } from "react";
import { useAuth } from "@/lib/auth-context";

type NameModalProps = {
  onClose?: () => void;
  heading?: string;
  description?: string;
  submitLabel?: string;
};

export default function NameModal({
  onClose,
  heading = "What should we call you?",
  description = "Add the name you want to see in your workspace.",
  submitLabel = "Continue",
}: NameModalProps) {
  const { user, displayName, saveDisplayName } = useAuth();
  const [name, setName] = useState(
    () => displayName ?? user?.email.split("@")[0] ?? "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const titleId = useId();
  const descriptionId = useId();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    const result = await saveDisplayName(name);
    setIsSubmitting(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    onClose?.();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
      onMouseDown={(event) => {
        if (onClose && event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-md overflow-hidden bg-[#faf7f2] border border-[#f2eaea] rounded-2xl shadow-2xl p-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#f87777]" />
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close profile"
            className="absolute top-4 right-4 grid h-9 w-9 place-items-center rounded-full text-xl text-[#696563] hover:bg-[#f2eaea] hover:text-[#11110f] transition-colors"
          >
            ×
          </button>
        ) : null}
        <div className="flex flex-col items-center text-center gap-2 mb-6">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-[#f2d3a2] text-[#11110f] font-bold text-2xl mb-2" aria-hidden="true">
            Hi
          </div>
          <h2 id={titleId} className="text-2xl font-bold text-[#11110f] tracking-tight">
            {heading}
          </h2>
          <p id={descriptionId} className="text-sm text-[#696563]">
            {description}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="display-name" className="text-xs font-semibold text-[#11110f] uppercase tracking-wider">
              Your name
            </label>
            <input
              id="display-name"
              type="text"
              required
              autoFocus
              autoComplete="name"
              maxLength={50}
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={isSubmitting}
              placeholder="e.g. Alex"
              className="w-full px-4 py-3 text-sm text-[#11110f] bg-white border border-[#d5ccc5] rounded-xl outline-none focus:border-[#f87777] focus:ring-2 focus:ring-[#f87777]/20 transition-all"
            />
          </div>
          {error ? <p className="text-xs font-medium text-red-600" role="alert">{error}</p> : null}
          <button
            type="submit"
            disabled={isSubmitting || !name.trim()}
            className="w-full py-3 text-sm font-semibold text-white bg-[#f87777] hover:bg-[#f65a5a] rounded-xl shadow-md transition-all disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : submitLabel}
          </button>
        </form>
      </div>
    </div>
  );
}
