"use client";

import type { ReactNode } from "react";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/lib/auth-context";
import { TodoProvider } from "@/lib/todo-context";

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <TodoProvider>
        <Toaster position="top-center" reverseOrder={false} />
        {children}
      </TodoProvider>
    </AuthProvider>
  );
}
