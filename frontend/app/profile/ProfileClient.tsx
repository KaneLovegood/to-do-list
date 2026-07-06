"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarBlank,
  CheckCircle,
  EnvelopeSimple,
  LockKey,
  ShieldCheck,
  UserCircle,
  WarningCircle,
} from "@phosphor-icons/react";
import { FormEvent, useEffect, useState } from "react";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/auth-context";
import type { Gender } from "@/lib/auth-context";
import styles from "./ProfilePage.module.css";
import toast from "react-hot-toast";

type Status = { type: "success" | "error"; message: string } | null;

const genderOptions: Array<{ value: Gender; label: string }> = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "non-binary", label: "Non-binary" },
  { value: "other", label: "Other" },
  { value: "prefer-not-to-say", label: "Prefer not to say" },
];

function StatusMessage({ status }: { status: Status }) {
  if (!status) return null;

  return (
    <p
      className={`${styles.status} ${status.type === "success" ? styles.success : styles.error}`}
      role={status.type === "error" ? "alert" : "status"}
    >
      {status.type === "success" ? (
        <CheckCircle size={18} weight="fill" aria-hidden="true" />
      ) : (
        <WarningCircle size={18} weight="fill" aria-hidden="true" />
      )}
      <span>{status.message}</span>
    </p>
  );
}

function ProfileContent() {
  const router = useRouter();
  const { user, isGuest, isLoading, updateProfile, changePassword, avatarUrl, uploadAvatar } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [profileStatus, setProfileStatus] = useState<Status>(null);
  const [passwordStatus, setPasswordStatus] = useState<Status>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const handleSelectPreset = async (presetUrl: string) => {
    setProfileStatus(null);
    const result = await updateProfile({
      displayName: user?.displayName || "",
      gender: user?.gender || undefined,
      age: user?.age || undefined,
      avatarUrl: presetUrl,
    });
    if (result.success) {
      toast.success("Avatar updated successfully!");
    } else {
      toast.error(result.message || "Failed to update avatar.");
    }
    setProfileStatus({ type: result.success ? "success" : "error", message: result.success ? "Avatar updated." : result.message });
  };

  const handleCustomAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    setProfileStatus(null);
    const result = await uploadAvatar(file);
    setIsUploadingAvatar(false);
    if (result.success) {
      toast.success("Avatar uploaded and updated!");
    } else {
      toast.error(result.message || "Failed to upload avatar.");
    }
    setProfileStatus({
      type: result.success ? "success" : "error",
      message: result.success ? "Avatar uploaded and updated." : result.message,
    });
  };

  useEffect(() => {
    if (passwordStatus?.type !== "success") return;
    const timeout = window.setTimeout(() => router.replace("/"), 1400);
    return () => window.clearTimeout(timeout);
  }, [passwordStatus, router]);

  if (isLoading) {
    return (
      <main className={styles.loadingPage} aria-label="Loading profile">
        <div className={styles.loadingHeader} />
        <div className={styles.loadingGrid}>
          <div className={styles.loadingAside} />
          <div className={styles.loadingContent} />
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className={styles.gateMain}>
        <section className={styles.gate}>
          <span className={styles.gateIcon} aria-hidden="true">
            <UserCircle size={30} weight="regular" />
          </span>
          <p className={styles.kicker}>Member profile</p>
          <h1>{isGuest ? "Create an account for a full profile" : "Sign in to view your profile"}</h1>
          <p>
            Profile details and password controls are available to signed-in members.
          </p>
          <Link href="/" className={styles.primaryLink}>
            Return to your workspace
          </Link>
        </section>
      </main>
    );
  }

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileStatus(null);

    const formData = new FormData(event.currentTarget);
    const cleanName = String(formData.get("displayName") ?? "").trim().replace(/\s+/g, " ");
    const selectedGender = String(formData.get("gender") ?? "") as Gender | "";
    const numericAge = Number(formData.get("age"));
    if (!cleanName || !selectedGender || !Number.isInteger(numericAge) || numericAge < 1 || numericAge > 120) {
      toast.error("Please complete your name, gender, and age.");
      setProfileStatus({
        type: "error",
        message: "Complete your name, gender, and age before saving.",
      });
      return;
    }

    setIsSavingProfile(true);
    const result = await updateProfile({
      displayName: cleanName,
      gender: selectedGender,
      age: numericAge,
    });
    setIsSavingProfile(false);
    if (result.success) {
      toast.success("Profile details saved!");
    } else {
      toast.error(result.message || "Failed to save profile.");
    }
    setProfileStatus({ type: result.success ? "success" : "error", message: result.message });
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordStatus(null);

    if (newPassword !== passwordConfirmation) {
      toast.error("New passwords do not match.");
      setPasswordStatus({ type: "error", message: "New passwords do not match." });
      return;
    }

    setIsSavingPassword(true);
    const result = await changePassword({
      currentPassword,
      newPassword,
      passwordConfirmation,
    });
    setIsSavingPassword(false);
    if (result.success) {
      toast.success("Password updated! Redirecting to sign in...");
      setCurrentPassword("");
      setNewPassword("");
      setPasswordConfirmation("");
    } else {
      toast.error(result.message || "Failed to update password.");
    }
    setPasswordStatus({ type: result.success ? "success" : "error", message: result.message });
  };

  return (
    <main className={styles.profileMain}>
      <Link href="/" className={styles.backLink}>
        <ArrowLeft size={17} weight="bold" aria-hidden="true" />
        Back to tasks
      </Link>

      <header className={styles.pageHeader}>
        <div>
          <p className={styles.kicker}>Account settings</p>
          <h1>Your profile</h1>
          <p>Keep your personal details current and your account protected.</p>
        </div>
        <div className={styles.securityNote}>
          <ShieldCheck size={21} weight="regular" aria-hidden="true" />
          <span>Your profile is private</span>
        </div>
      </header>

      <div className={styles.profileLayout}>
        <aside className={styles.identityPanel} aria-label="Profile summary">
          <div className={styles.avatarContainer}>
            <Image
              className={styles.avatar}
              src={avatarUrl}
              alt=""
              width={88}
              height={88}
              priority
            />
            <button
              type="button"
              className={styles.changeAvatarBtn}
              onClick={() => setIsPickerOpen((prev) => !prev)}
              aria-label="Change avatar"
            >
              ✎
            </button>
          </div>

          {isPickerOpen ? (
            <div className={styles.avatarPicker}>
              <h3>Choose Avatar</h3>
              <div className={styles.presetGrid}>
                {["profile", "member-1", "member-2", "member-3", "member-4"].map((presetName) => {
                  const presetUrl = `/avatars/${presetName}.png`;
                  return (
                    <button
                      key={presetName}
                      type="button"
                      className={`${styles.presetBtn} ${avatarUrl === presetUrl ? styles.activePreset : ""}`}
                      onClick={() => handleSelectPreset(presetUrl)}
                    >
                      <Image src={presetUrl} alt={presetName} width={38} height={38} />
                    </button>
                  );
                })}
              </div>

              {!isGuest ? (
                <div className={styles.customUploadSection}>
                  <label className={styles.uploadBtnLabel}>
                    Upload photo
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleCustomAvatarUpload}
                      style={{ display: "none" }}
                      disabled={isUploadingAvatar}
                    />
                  </label>
                  {isUploadingAvatar ? <span className={styles.uploadingText}>Uploading...</span> : null}
                </div>
              ) : (
                <small className={styles.guestNote}>Sign in to upload custom photos.</small>
              )}
            </div>
          ) : null}

          <div className={styles.identityCopy}>
            <p className={styles.memberLabel}>{isGuest ? "Guest account" : "Member account"}</p>
            <h2>{user.displayName || user.email.split("@")[0]}</h2>
            <p>{user.email}</p>
          </div>
          <nav className={styles.profileNav} aria-label="Profile sections">
            <a href="#personal-details">Personal details</a>
            {!isGuest ? <a href="#password">Password</a> : null}
          </nav>
        </aside>

        <div className={styles.formColumn}>
          <section className={styles.formSection} id="personal-details">
            <div className={styles.sectionHeader}>
              <span className={styles.sectionIcon} aria-hidden="true">
                <UserCircle size={22} weight="regular" />
              </span>
              <div>
                <h2>Personal details</h2>
                <p>Information used to personalize your workspace.</p>
              </div>
            </div>

            <form onSubmit={handleProfileSubmit} className={styles.form}>
              <div className={styles.fieldGrid}>
                <label className={styles.field}>
                  <span>Name</span>
                  <span className={styles.inputShell}>
                    <UserCircle size={18} aria-hidden="true" />
                    <input
                      name="displayName"
                      type="text"
                      autoComplete="name"
                      maxLength={50}
                      required
                      defaultValue={user.displayName ?? ""}
                      disabled={isSavingProfile}
                    />
                  </span>
                </label>

                <label className={styles.field}>
                  <span>Gender</span>
                  <span className={styles.inputShell}>
                    <UserCircle size={18} aria-hidden="true" />
                    <select
                      name="gender"
                      required
                      defaultValue={user.gender ?? ""}
                      disabled={isSavingProfile}
                    >
                      <option value="" disabled>Select gender</option>
                      {genderOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </span>
                </label>

                <label className={styles.field}>
                  <span>Age</span>
                  <span className={styles.inputShell}>
                    <CalendarBlank size={18} aria-hidden="true" />
                    <input
                      name="age"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={120}
                      required
                      defaultValue={user.age ?? ""}
                      disabled={isSavingProfile}
                    />
                  </span>
                </label>

                <label className={`${styles.field} ${styles.emailField}`}>
                  <span>Email</span>
                  <span className={`${styles.inputShell} ${styles.readonlyShell}`}>
                    <EnvelopeSimple size={18} aria-hidden="true" />
                    <input type="email" value={user.email} readOnly aria-describedby="email-note" />
                  </span>
                  <small id="email-note">Contact support if you need to change your sign-in email.</small>
                </label>
              </div>

              <div className={styles.formFooter}>
                <StatusMessage status={profileStatus} />
                <button type="submit" className={styles.primaryButton} disabled={isSavingProfile}>
                  {isSavingProfile ? "Saving..." : "Save profile"}
                </button>
              </div>
            </form>
          </section>

          <section className={styles.formSection} id="password">
            <div className={styles.sectionHeader}>
              <span className={styles.sectionIcon} aria-hidden="true">
                <LockKey size={21} weight="regular" />
              </span>
              <div>
                <h2>Change password</h2>
                <p>Use at least 8 characters. You will sign in again after saving.</p>
              </div>
            </div>

            <form onSubmit={handlePasswordSubmit} className={styles.form}>
              <div className={styles.passwordGrid}>
                <label className={styles.field}>
                  <span>Current password</span>
                  <span className={styles.inputShell}>
                    <LockKey size={18} aria-hidden="true" />
                    <input
                      type="password"
                      autoComplete="current-password"
                      minLength={8}
                      maxLength={128}
                      required
                      value={currentPassword}
                      onChange={(event) => setCurrentPassword(event.target.value)}
                      disabled={isSavingPassword}
                    />
                  </span>
                </label>
                <label className={styles.field}>
                  <span>New password</span>
                  <span className={styles.inputShell}>
                    <LockKey size={18} aria-hidden="true" />
                    <input
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      maxLength={128}
                      required
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      disabled={isSavingPassword}
                    />
                  </span>
                </label>
                <label className={styles.field}>
                  <span>Confirm new password</span>
                  <span className={styles.inputShell}>
                    <LockKey size={18} aria-hidden="true" />
                    <input
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      maxLength={128}
                      required
                      value={passwordConfirmation}
                      onChange={(event) => setPasswordConfirmation(event.target.value)}
                      disabled={isSavingPassword}
                    />
                  </span>
                </label>
              </div>

              <div className={styles.formFooter}>
                <StatusMessage status={passwordStatus} />
                <button type="submit" className={styles.secondaryButton} disabled={isSavingPassword}>
                  {isSavingPassword ? "Updating..." : "Update password"}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}

export default function ProfileClient() {
  return (
    <div className="site-shell">
      <Navbar />
      <ProfileContent />
      <Footer />
    </div>
  );
}
