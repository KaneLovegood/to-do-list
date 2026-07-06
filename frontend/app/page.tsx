"use client";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import TodoDashboard from "@/components/TodoDashboard";
import AuthModal from "@/components/AuthModal";
import NameModal from "@/components/NameModal";
import { useAuth } from "@/lib/auth-context";

function MainContent() {
  const { user, isGuest, isLoading, displayName } = useAuth();

  if (isLoading) {
    return (
      <div className="site-shell flex items-center justify-center min-h-dvh bg-[#faf7f2]">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-10 h-10 border-4 border-[#f87777] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-[#696563]">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  // Show auth modal if user is neither authenticated nor a guest
  const showAuth = !user && !isGuest;
  const showNamePrompt = Boolean(user || isGuest) && !displayName;

  return (
    <div className="site-shell">
      <Navbar />
      <main className="home-main">
        <h1 className="welcome-heading">
          <span className="welcome-heading__greeting">{`Hello, ${displayName || "Guest"}`}</span>
          <span className="welcome-heading__prompt">Start planning today</span>
        </h1>
        <TodoDashboard />
      </main>
      <Footer />

      {showAuth && <AuthModal />}
      {showNamePrompt && <NameModal />}
    </div>
  );
}

export default function Home() {
  return <MainContent />;
}
