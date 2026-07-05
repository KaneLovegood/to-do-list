import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vista Lab | Todo planner",
  description: "Plan, prioritize, and complete your daily tasks with Vista Lab.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
