"use client";

import React, { createContext, useContext } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";

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
  const router = useRouter();
  const fetcher = (url: string) => fetch(url).then(res => res.json());

  const { data, isLoading, mutate } = useSWR("/api/users/me", fetcher, {
    revalidateOnFocus: false, // Prevents spamming the DB when switching tabs
    shouldRetryOnError: false, // Fail fast for unauthenticated users
  });

  const user = data?.success ? data.data : null;

  const refreshUser = async () => {
    await mutate();
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Logout fetch can also fail if shields block it — safe to ignore
    } finally {
      mutate(undefined, false);
      router.push("/login");
      router.refresh();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        refreshUser,
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
