"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import UserMenu from "@/components/UserMenu";

import Image from "next/image";

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className={`brand ${compact ? "brand--compact" : ""}`} aria-label="Todo planner home">
      <span className="brand__mark" aria-hidden="true">
        <Image
          src="/favicon.ico"
          alt="Todo planner"
          width={compact ? 16 : 24}
          height={compact ? 16 : 24}
          className="object-contain"
        />
      </span>
      <span className="brand__name">Todo planner</span>
    </Link>
  );
}

export { Brand };

export default function Navbar() {
  const { user, isGuest } = useAuth();

  return (
    <header className="navbar">
      <div className="navbar__inner flex items-center justify-between w-full">
        <Brand />

        <div className="flex items-center gap-4">
          {user ? (
            <span className="text-xs text-[#696563] hidden md:inline font-medium">
              {user.email} (Member)
            </span>
          ) : isGuest ? (
            <span className="text-xs text-[#696563] font-medium px-2.5 py-1 bg-[#f2d3a2]/30 border border-[#f2d3a2] rounded-full">
              Guest Mode
            </span>
          ) : null}
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
