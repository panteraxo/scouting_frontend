"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  changePasswordRequest,
  getCurrentUser,
  loginRequest,
  logoutRequest,
  type ChangePasswordInput,
} from "./auth-api";
import { ApiError } from "@/lib/api-client";
import type { UserResponse } from "@/types/api";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  user: UserResponse | null;
  sessionError: string | null;
  login: (email: string, password: string) => Promise<UserResponse>;
  logout: () => Promise<void>;
  changePassword: (input: ChangePasswordInput) => Promise<UserResponse>;
  markSessionExpired: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<UserResponse | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    getCurrentUser()
      .then((currentUser) => {
        if (!isActive) {
          return;
        }

        setUser(currentUser);
        setStatus("authenticated");
        setSessionError(null);
      })
      .catch((error: unknown) => {
        if (!isActive) {
          return;
        }

        setUser(null);
        setStatus("unauthenticated");

        if (error instanceof ApiError && error.status === 401) {
          setSessionError(null);
          return;
        }

        setSessionError(
          error instanceof Error
            ? error.message
            : "No se pudo verificar la sesión.",
        );
      });

    return () => {
      isActive = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const authenticated = await loginRequest({ email, password });
    setUser(authenticated);
    setStatus("authenticated");
    setSessionError(null);
    return authenticated;
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      setUser(null);
      setStatus("unauthenticated");
      setSessionError(null);
    }
  }, []);

  const changePassword = useCallback(async (input: ChangePasswordInput) => {
    const updated = await changePasswordRequest(input);
    setUser(updated);
    setStatus("authenticated");
    return updated;
  }, []);

  const markSessionExpired = useCallback(() => {
    setUser(null);
    setStatus("unauthenticated");
    setSessionError("Tu sesión expiró. Inicia sesión nuevamente.");
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      sessionError,
      login,
      logout,
      changePassword,
      markSessionExpired,
    }),
    [
      status,
      user,
      sessionError,
      login,
      logout,
      changePassword,
      markSessionExpired,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider.");
  }

  return context;
}
