"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { setSessionExpiredHandler, tokenStore } from "@/lib/api/client";
import { authApi } from "@/lib/api/endpoints";
import type { RegisterRequest, UserResponse } from "@/lib/api/types";

interface AuthState {
  user: UserResponse | null;
  /** True until the initial token check completes; guards against a login/content flash. */
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (body: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  isOwner: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  /**
   * Rehydrate from the stored token on mount.
   *
   * The token is not decoded client-side; the API is asked who it belongs to.
   * Trusting a locally-decoded JWT would mean a user who edits localStorage can
   * change what the UI thinks their role is — harmless for the API, which
   * re-verifies everything, but it would show them buttons that only 403.
   */
  useEffect(() => {
    let cancelled = false;

    async function restore() {
      if (!tokenStore.getAccessToken()) {
        setLoading(false);
        return;
      }
      try {
        const me = await authApi.me();
        if (!cancelled) setUser(me);
      } catch {
        tokenStore.clear();
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void restore();
    return () => {
      cancelled = true;
    };
  }, []);

  // The API client cannot import this context, so it hands back a callback.
  useEffect(() => {
    setSessionExpiredHandler(() => {
      setUser(null);
      tokenStore.clear();
      toast.error("Your session expired. Please sign in again.");
    });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const tokens = await authApi.login(email, password);
    tokenStore.save(tokens);
    setUser(tokens.user);
  }, []);

  const register = useCallback(async (body: RegisterRequest) => {
    const tokens = await authApi.register(body);
    tokenStore.save(tokens);
    setUser(tokens.user);
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = tokenStore.getRefreshToken();
    // Clear locally first: the user asked to sign out, and that should happen
    // whether or not the revoke call reaches the server.
    tokenStore.clear();
    setUser(null);

    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
        // Already invalid server-side, which is the desired end state anyway.
      }
    }
    router.push("/");
  }, [router]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      isOwner: user?.role === "OWNER" || user?.role === "AGENT" || user?.role === "ADMIN",
    }),
    [user, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return context;
}
