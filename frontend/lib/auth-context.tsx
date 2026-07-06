"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  apiFetch,
  setAccessToken,
  registerAuthFailureCallback,
} from "./api-client";

export type Gender =
  | "female"
  | "male"
  | "non-binary"
  | "other"
  | "prefer-not-to-say";

export type User = {
  id: string;
  email: string;
  displayName: string | null;
  gender: Gender | null;
  age: number | null;
  avatarUrl?: string | null;
};

type AuthResult = { success: boolean; message: string };
export type ProfileUpdate = {
  displayName: string;
  gender?: Gender;
  age?: number;
  avatarUrl?: string;
};
export type PasswordUpdate = {
  currentPassword: string;
  newPassword: string;
  passwordConfirmation: string;
};

type AuthContextType = {
  user: User | null;
  isGuest: boolean;
  isLoading: boolean;
  displayName: string | null;
  avatarUrl: string;
  register: (
    email: string,
    password: string,
    passwordConfirmation: string,
  ) => Promise<AuthResult>;
  verifyRegistration: (email: string, otp: string) => Promise<AuthResult>;
  login: (email: string, password: string) => Promise<AuthResult>;
  continueAsGuest: () => void;
  logout: () => Promise<void>;
  clearGuestStatus: () => void;
  saveDisplayName: (displayName: string) => Promise<AuthResult>;
  updateProfile: (profile: ProfileUpdate) => Promise<AuthResult>;
  changePassword: (passwords: PasswordUpdate) => Promise<AuthResult>;
  uploadAvatar: (file: File) => Promise<AuthResult>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getErrorMessage(data: { message?: string | string[] }, fallback: string) {
  if (Array.isArray(data.message)) {
    return data.message[0] ?? fallback;
  }
  return data.message || fallback;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [guestDisplayName, setGuestDisplayName] = useState<string | null>(null);
  const [guestAvatarUrl, setGuestAvatarUrl] = useState<string | null>(null);

  // Auth failure callback handler (called when refresh fails)
  const handleAuthFailure = () => {
    setUser(null);
    setAccessToken(null);
  };

  useEffect(() => {
    registerAuthFailureCallback(handleAuthFailure);

    // Initial session load
    const initializeAuth = async () => {
      try {
        const response = await fetch("/api/auth/refresh", { method: "POST" });
        if (response.ok) {
          const data = await response.json();
          setAccessToken(data.accessToken);

          // Get user details
          const meResponse = await apiFetch("/api/auth/me");
          if (meResponse.ok) {
            const meData = await meResponse.json();
            setUser(meData.user);
            setIsGuest(false);
            setIsLoading(false);
            return;
          }
        }
      } catch (err) {
        console.error("Failed to verify active session:", err);
      }

      // If auth session check fails, fall back to guest check
      const localIsGuest = localStorage.getItem("todo_is_guest");
      if (localIsGuest === "true") {
        setIsGuest(true);
        setGuestDisplayName(localStorage.getItem("todo_guest_display_name"));
        setGuestAvatarUrl(localStorage.getItem("todo_guest_avatar_url"));
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const register = async (
    email: string,
    password: string,
    passwordConfirmation: string,
  ): Promise<AuthResult> => {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, passwordConfirmation }),
      });
      const data = await response.json();
      if (response.ok) {
        return { success: true, message: data.message };
      } else {
        return {
          success: false,
          message: getErrorMessage(data, "Could not create account."),
        };
      }
    } catch {
      return { success: false, message: "Could not connect to auth server." };
    }
  };

  const verifyRegistration = async (
    email: string,
    otp: string,
  ): Promise<AuthResult> => {
    try {
      const response = await fetch("/api/auth/verify-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await response.json();
      if (response.ok) {
        return { success: true, message: data.message };
      } else {
        return {
          success: false,
          message: getErrorMessage(data, "Invalid verification code."),
        };
      }
    } catch {
      return { success: false, message: "Could not connect to auth server." };
    }
  };

  const login = async (email: string, password: string): Promise<AuthResult> => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          message: getErrorMessage(data, "Invalid email or password."),
        };
      }

      setAccessToken(data.accessToken);
      setUser(data.user);
      setIsGuest(false);
      localStorage.removeItem("todo_is_guest");
      return { success: true, message: "Logged in successfully." };
    } catch {
      return { success: false, message: "Could not connect to auth server." };
    }
  };

  const continueAsGuest = () => {
    setIsGuest(true);
    setUser(null);
    localStorage.setItem("todo_is_guest", "true");
    setGuestDisplayName(localStorage.getItem("todo_guest_display_name"));
    setGuestAvatarUrl(localStorage.getItem("todo_guest_avatar_url"));
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout failed on server:", err);
    } finally {
      setUser(null);
      setAccessToken(null);
      setIsGuest(false);
      setGuestDisplayName(null);
      setGuestAvatarUrl(null);
      localStorage.removeItem("todo_is_guest");
    }
  };

  const clearGuestStatus = () => {
    setIsGuest(false);
    localStorage.removeItem("todo_is_guest");
    localStorage.removeItem("todo_guest_avatar_url");
    setGuestAvatarUrl(null);
  };

  const normalizeDisplayName = (name: string) => name.trim().replace(/\s+/g, " ");

const updateGuestProfile = (profile: ProfileUpdate): AuthResult => {
  if (profile.displayName !== undefined) {
    const cleanName = normalizeDisplayName(profile.displayName);

    localStorage.setItem("todo_guest_display_name", cleanName);
    setGuestDisplayName(cleanName);
  }

  if (profile.avatarUrl !== undefined) {
    localStorage.setItem("todo_guest_avatar_url", profile.avatarUrl);
    setGuestAvatarUrl(profile.avatarUrl);
  }

  return { success: true, message: "Profile saved." };
};

const updateProfile = async (
  profile: ProfileUpdate
): Promise<AuthResult> => {
  if (!profile || Object.keys(profile).length === 0) {
    return { success: false, message: "No profile changes provided." };
  }

  if (isGuest) {
    return updateGuestProfile(profile);
  }

  if (!user) {
    return {
      success: false,
      message: "Sign in before updating your profile.",
    };
  }

  try {
    const response = await apiFetch("/api/auth/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        success: false,
        message: getErrorMessage(data, "Could not update profile."),
      };
    }

    setUser(data.user);

    return { success: true, message: "Profile saved." };
  } catch {
    return {
      success: false,
      message: "Could not connect to the profile server.",
    };
  }
};

  const saveDisplayName = async (displayName: string): Promise<AuthResult> => {
    const cleanName = displayName.trim().replace(/\s+/g, " ");
    if (!cleanName || cleanName.length > 50) {
      return { success: false, message: "Enter a name between 1 and 50 characters." };
    }

    return updateProfile({ displayName: cleanName });
  };

  const changePassword = async (
    passwords: PasswordUpdate,
  ): Promise<AuthResult> => {
    if (!user) {
      return { success: false, message: "Sign in before changing your password." };
    }

    try {
      const response = await apiFetch("/api/auth/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passwords),
      });
      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          message: getErrorMessage(data, "Could not update your password."),
        };
      }
      setAccessToken(null);
      return { success: true, message: data.message };
    } catch {
      return { success: false, message: "Could not connect to the profile server." };
    }
  };

  const uploadAvatar = async (file: File): Promise<AuthResult> => {
    if (isGuest) {
      return { success: false, message: "Custom avatar upload is only available for registered members." };
    }
    if (!user) {
      return { success: false, message: "Sign in before uploading your avatar." };
    }

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const response = await apiFetch("/api/auth/avatar", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          message: getErrorMessage(data, "Could not upload avatar."),
        };
      }
      setUser(data.user);
      return { success: true, message: "Avatar uploaded successfully." };
    } catch {
      return { success: false, message: "Could not connect to the profile server." };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isGuest,
        isLoading,
        displayName: user?.displayName ?? guestDisplayName,
        avatarUrl: user?.avatarUrl || guestAvatarUrl || "/avatars/profile.png",
        register,
        verifyRegistration,
        login,
        continueAsGuest,
        logout,
        clearGuestStatus,
        saveDisplayName,
        updateProfile,
        changePassword,
        uploadAvatar,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
