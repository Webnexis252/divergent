"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

export type UserRole = "STUDENT" | "MENTOR" | "ADMIN" | "SUPER_ADMIN";

export interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  role: UserRole;
  image: string | null;
  streakCount: number;
  totalStudyTime: number;
  enrollments: Array<{
    courseId?: string;
    id?: string;
    progressPercent?: number;
    status?: string;
  }>;
}

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const fetchProfile = useCallback(async () => {
    try {
      const response = await fetch("/api/users/me", { cache: "no-store" });
      if (response.ok) {
        const payload = await response.json();
        if (payload.success) {
          setUser(payload.data);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch {
      // Network failures (ad-blockers, no connectivity) are expected for
      // unauthenticated visitors — swallow silently so the Next.js dev
      // overlay doesn't hijack the screen with a red TypeError banner.
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Logout fetch can also fail if shields block it — safe to ignore
    } finally {
      setUser(null);
      router.push("/login");
      router.refresh();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        refreshUser: fetchProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
