"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

interface AuthUser {
  id: number;
  email: string;
  name: string;
  avatar?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/session");
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Failed to refresh session:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const signIn = async () => {
    try {
      setLoading(true);
      window.location.href = "/api/auth/signin";
    } catch (error) {
      console.error("Sign in failed:", error);
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await fetch("/api/auth/signout", {
        method: "POST",
      });
      setUser(null);
      window.location.href = "/";
    } catch (error) {
      console.error("Sign out failed:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signOut,
        refreshSession,
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
