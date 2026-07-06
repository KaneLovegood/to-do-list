"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { SignIn, SignOut, UserCircle } from "@phosphor-icons/react";
import { KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import styles from "./UserMenu.module.css";

export default function UserMenu() {
  const { user, isGuest, displayName, logout, avatarUrl } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setIsOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  if (!user && !isGuest) {
    return (
      <Image
        className="navbar__avatar border border-[#f2eaea]"
        src="/avatars/profile.png"
        alt="User avatar"
        width={40}
        height={40}
        priority
      />
    );
  }

  const closeMenu = () => setIsOpen(false);

  const handleSessionAction = async () => {
    closeMenu();
    await logout();
  };

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;

    event.preventDefault();
    const items = itemRefs.current.filter(Boolean) as HTMLButtonElement[];
    const activeIndex = items.indexOf(document.activeElement as HTMLButtonElement);
    const nextIndex = event.key === "ArrowDown"
      ? (activeIndex + 1) % items.length
      : (activeIndex - 1 + items.length) % items.length;
    items[nextIndex]?.focus();
  };

  const menuName = displayName || "Guest";
  const accountLabel = user ? "Member account" : "Guest workspace";

  return (
    <>
      <div className={styles.menuRoot} ref={menuRef}>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          onKeyDown={(event) => {
            if (event.key !== "ArrowDown") return;
            event.preventDefault();
            setIsOpen(true);
            requestAnimationFrame(() => itemRefs.current[0]?.focus());
          }}
          className={styles.trigger}
          aria-label={isOpen ? "Close account menu" : "Open account menu"}
          aria-controls={menuId}
          aria-haspopup="menu"
          aria-expanded={isOpen}
        >
          <Image
            className="navbar__avatar border border-[#f2eaea]"
            src={avatarUrl}
            alt=""
            width={40}
            height={40}
            priority
          />
          <span className={styles.presence} aria-hidden="true" />
        </button>

        {isOpen ? (
          <div
            id={menuId}
            className={styles.dropdown}
            role="menu"
            aria-label="Account"
            onKeyDown={handleMenuKeyDown}
          >
            <div className={styles.identity}>
              <Image
                className={styles.profileImage}
                src={avatarUrl}
                alt=""
                width={48}
                height={48}
              />
              <div className={styles.identityCopy}>
                <div className={styles.identityMeta}>
                  <span>{accountLabel}</span>
                </div>
                <p className={styles.name}>{menuName}</p>
                <p className={styles.email}>{user?.email || "Local session"}</p>
              </div>
            </div>

            <div className={styles.actions}>
              <p className={styles.sectionLabel}>Account</p>
              <button
                ref={(node) => { itemRefs.current[0] = node; }}
                type="button"
                role="menuitem"
                onClick={() => {
                  closeMenu();
                  router.push("/profile");
                }}
                className={styles.action}
              >
                <span className={styles.actionIcon} aria-hidden="true">
                  <UserCircle size={19} weight="regular" />
                </span>
                <strong>Profile</strong>
              </button>
            </div>

            <div className={styles.sessionArea}>
              <button
                ref={(node) => { itemRefs.current[1] = node; }}
                type="button"
                role="menuitem"
                onClick={handleSessionAction}
                className={styles.sessionAction}
              >
                <span className={styles.sessionIcon} aria-hidden="true">
                  {user ? <SignOut size={19} weight="regular" /> : <SignIn size={19} weight="regular" />}
                </span>
                <strong>{user ? "Log out" : "Sign in"}</strong>
              </button>
            </div>
          </div>
        ) : null}
      </div>

    </>
  );
}
