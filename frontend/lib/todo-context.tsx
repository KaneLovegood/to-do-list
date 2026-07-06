"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { Todo } from "@/types/todo";
import { useAuth } from "./auth-context";
import { apiFetch } from "./api-client";
import toast from "react-hot-toast";

type TodoContextType = {
  todos: Todo[];
  isLoading: boolean;
  isSubmitting: boolean;
  addTodo: (formData: FormData) => Promise<{ success: boolean; error?: string }>;
  updateTodo: (id: string, updateData: Partial<Todo> | FormData) => Promise<{ success: boolean; error?: string }>;
  toggleTodo: (todo: Todo) => Promise<{ success: boolean; error?: string }>;
  deleteTodo: (todo: Todo) => Promise<{ success: boolean; error?: string }>;
  importGuestTodos: (guestTodos: Todo[]) => Promise<{ success: boolean; error?: string }>;
};

const TodoContext = createContext<TodoContextType | undefined>(undefined);

export function TodoProvider({ children }: { children: React.ReactNode }) {
  const { user, isGuest } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchTodos = async () => {
      setIsLoading(true);
      if (user) {
        try {
          const response = await apiFetch("/api/todos");
          if (response.ok) {
            const data = await response.json();
            setTodos(data.todos || []);
          } else {
            setTodos([]);
          }
        } catch {
          setTodos([]);
        }
      } else if (isGuest) {
        const localTodos = localStorage.getItem("todo_guest_todos");
        if (localTodos) {
          try {
            setTodos(JSON.parse(localTodos));
          } catch {
            setTodos([]);
          }
        } else {
          setTodos([]);
        }
      } else {
        setTodos([]);
      }
      setIsLoading(false);
    };

    fetchTodos();
  }, [user, isGuest]);

  const addTodo = async (formData: FormData) => {
    setIsSubmitting(true);
    try {
      if (isGuest) {
        // Upload images to Cloudinary (via public upload-image endpoint) if guest selects files
        const imageUrls: string[] = [];
        const files = formData.getAll("images") as File[];
        for (const file of files) {
          if (file && file.size > 0) {
            const uploadFormData = new FormData();
            uploadFormData.append("image", file);
            const uploadRes = await fetch("/api/todos/upload-image", {
              method: "POST",
              body: uploadFormData,
            });
            if (uploadRes.ok) {
              const data = await uploadRes.json();
              if (data.url) imageUrls.push(data.url);
            }
          }
        }

        // Support pasted imageUrl if available
        const inputImageUrl = formData.get("imageUrl") as string | null;
        const mainImageUrl = imageUrls[0] || inputImageUrl || null;

        const newTodo: Todo = {
          id: `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          title: (formData.get("title") as string) || "Untitled",
          description: (formData.get("description") as string) || "",
          completed: false,
          startDate: (formData.get("startDate") as string) || null,
          deadline: (formData.get("deadline") as string) || null,
          imageUrl: mainImageUrl,
          imageUrls: imageUrls.length > 0 ? imageUrls : (mainImageUrl ? [mainImageUrl] : []),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const updated = [newTodo, ...todos];
        setTodos(updated);
        localStorage.setItem("todo_guest_todos", JSON.stringify(updated));
        toast.success("Task created successfully!");
        return { success: true };
      } else {
        // Authenticated flow - passes images to /api/todos and creates in DB
        const response = await apiFetch("/api/todos", {
          method: "POST",
          body: formData,
        });
        const payload = await response.json();
        if (response.ok && payload.todo) {
          setTodos((current) => [payload.todo, ...current]);
          toast.success("Task created successfully!");
          return { success: true };
        } else {
          const errorMsg = payload.message || "Failed to add task.";
          toast.error(errorMsg);
          return { success: false, error: errorMsg };
        }
      }
    } catch {
      toast.error("Network error occurred.");
      return { success: false, error: "Network error occurred." };
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateTodo = async (id: string, updateData: Partial<Todo> | FormData, isSilent = false) => {
    try {
      if (isGuest) {
        const updatedTodos = [...todos];
        const index = updatedTodos.findIndex((t) => t.id === id);
        if (index === -1) {
          if (!isSilent) toast.error("Todo not found.");
          return { success: false, error: "Todo not found." };
        }

        const currentTodo = updatedTodos[index];

        if (updateData instanceof FormData) {
          const title = updateData.get("title") as string | null;
          const description = updateData.get("description") as string | null;
          const startDate = updateData.get("startDate") as string | null;
          const deadline = updateData.get("deadline") as string | null;
          const removeImage = updateData.get("removeImage") === "true";
          const inputImageUrl = updateData.get("imageUrl") as string | null;

          let imageUrl = currentTodo.imageUrl;
          let imageUrls = currentTodo.imageUrls || [];

          const files = updateData.getAll("images") as File[];
          const uploadedUrls: string[] = [];
          for (const file of files) {
            if (!file || file.size === 0) continue;
            const uploadFormData = new FormData();
            uploadFormData.append("image", file);
            const uploadRes = await fetch("/api/todos/upload-image", {
              method: "POST",
              body: uploadFormData,
            });
            if (uploadRes.ok) {
              const data = await uploadRes.json();
              if (data.url) uploadedUrls.push(data.url);
            }
          }

          if (removeImage) {
            imageUrl = null;
            imageUrls = [];
          } else {
            const existingUrls = imageUrls.length > 0 ? imageUrls : (imageUrl ? [imageUrl] : []);
            imageUrls = [...existingUrls, ...uploadedUrls];
            if (inputImageUrl) imageUrls.push(inputImageUrl);
            imageUrl = imageUrls[0] || null;
          }

          updatedTodos[index] = {
            ...currentTodo,
            title: title !== null ? title : currentTodo.title,
            description: description !== null ? description : currentTodo.description,
            startDate: startDate !== null ? startDate : currentTodo.startDate,
            deadline: deadline !== null ? deadline : currentTodo.deadline,
            imageUrl,
            imageUrls,
            updatedAt: new Date().toISOString(),
          };
        } else {
          // JSON partial update
          updatedTodos[index] = {
            ...currentTodo,
            ...updateData,
            updatedAt: new Date().toISOString(),
          };
        }

        setTodos(updatedTodos);
        localStorage.setItem("todo_guest_todos", JSON.stringify(updatedTodos));
        if (!isSilent) toast.success("Task updated successfully!");
        return { success: true };
      } else {
        let init: RequestInit;
        if (updateData instanceof FormData) {
          init = { method: "PATCH", body: updateData };
        } else {
          init = {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updateData),
          };
        }

        const response = await apiFetch(`/api/todos/${id}`, init);
        const payload = await response.json();
        if (response.ok && payload.todo) {
          setTodos((current) => current.map((item) => (item.id === id ? payload.todo : item)));
          if (!isSilent) toast.success("Task updated successfully!");
          return { success: true };
        } else {
          const errorMsg = payload.message || "Failed to update task.";
          if (!isSilent) toast.error(errorMsg);
          return { success: false, error: errorMsg };
        }
      }
    } catch {
      if (!isSilent) toast.error("Network error occurred.");
      return { success: false, error: "Network error occurred." };
    }
  };

  const toggleTodo = async (todo: Todo) => {
    const nextState = !todo.completed;
    const res = await updateTodo(todo.id, { completed: nextState }, true);
    if (res.success) {
      if (nextState) {
        toast.success("Task completed! 🎉");
      } else {
        toast.success("Task marked as pending.");
      }
    } else {
      toast.error(res.error || "Failed to update task.");
    }
    return res;
  };

  const deleteTodo = async (todo: Todo) => {
    try {
      if (isGuest) {
        const updated = todos.filter((t) => t.id !== todo.id);
        setTodos(updated);
        localStorage.setItem("todo_guest_todos", JSON.stringify(updated));
        toast.success("Task deleted.");
        return { success: true };
      } else {
        const response = await apiFetch(`/api/todos/${todo.id}`, { method: "DELETE" });
        if (response.ok) {
          setTodos((current) => current.filter((item) => item.id !== todo.id));
          toast.success("Task deleted.");
          return { success: true };
        } else {
          const payload = await response.json();
          const errorMsg = payload.message || "Failed to delete task.";
          toast.error(errorMsg);
          return { success: false, error: errorMsg };
        }
      }
    } catch {
      toast.error("Network error occurred.");
      return { success: false, error: "Network error occurred." };
    }
  };

  const importGuestTodos = async (guestTodos: Todo[]) => {
    try {
      const todosToImport = guestTodos.map((t) => ({
        title: t.title,
        description: t.description,
        startDate: t.startDate,
        deadline: t.deadline,
        imageUrl: t.imageUrl,
      }));

      const response = await apiFetch("/api/todos/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ todos: todosToImport }),
      });

      if (response.ok) {
        localStorage.removeItem("todo_guest_todos");
        
        // Fetch fresh list from backend
        const fetchResponse = await apiFetch("/api/todos");
        if (fetchResponse.ok) {
          const fetchData = await fetchResponse.json();
          setTodos(fetchData.todos || []);
        }
        toast.success(`${guestTodos.length} guest tasks imported!`);
        return { success: true };
      } else {
        const payload = await response.json();
        const errorMsg = payload.message || "Failed to import guest todos.";
        toast.error(errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch {
      toast.error("Network error during migration.");
      return { success: false, error: "Network error during migration." };
    }
  };

  return (
    <TodoContext.Provider
      value={{
        todos,
        isLoading,
        isSubmitting,
        addTodo,
        updateTodo,
        toggleTodo,
        deleteTodo,
        importGuestTodos,
      }}
    >
      {children}
    </TodoContext.Provider>
  );
}

export function useTodos() {
  const context = useContext(TodoContext);
  if (!context) {
    throw new Error("useTodos must be used within a TodoProvider");
  }
  return context;
}
