"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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

export type AuthStatus =
  | "idle"
  | "loading"
  | "authenticated"
  | "unauthenticated"
  | "error";

interface AuthContextValue {
  status: AuthStatus;
  user: UserResponse | null;
  sessionError: string | null;
  login: (email: string, password: string) => Promise<UserResponse>;
  logout: () => Promise<void>;
  changePassword: (input: ChangePasswordInput) => Promise<UserResponse>;
  markSessionExpired: () => void;
  retrySession: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const PUBLIC_AUTH_ROUTES = ["/login", "/registro/ojeador"];
const SESSION_TIMEOUT_MS = 12000;
const SESSION_ERROR_MESSAGE =
  "No pudimos verificar tu sesión. Revisa tu conexión e inténtalo de nuevo.";

/** Rutas públicas de autenticación que nunca bloquean el formulario. */
export function isPublicAuthRoute(pathname: string | null): boolean {
  if (!pathname) {
    return false;
  }

  const normalized = pathname.replace(/\/+$/, "") || "/";
  return PUBLIC_AUTH_ROUTES.includes(normalized);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("idle");
  const [user, setUser] = useState<UserResponse | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const verificationInFlightRef = useRef(false);
  const verificationAttemptRef = useRef(0);
  const verificationControllerRef = useRef<AbortController | null>(null);
  const pathname = usePathname();
  const isPublicRoute = isPublicAuthRoute(pathname);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const verifySession = useCallback((blocking: boolean) => {
    if (verificationInFlightRef.current) {
      // Una verificación nueva reemplaza a la anterior en curso: se cancela
      // para que su respuesta no quede pendiente ni bloquee la pantalla.
      verificationControllerRef.current?.abort();
    }

    const attempt = verificationAttemptRef.current + 1;
    verificationAttemptRef.current = attempt;
    verificationInFlightRef.current = true;
    const controller = new AbortController();
    verificationControllerRef.current = controller;
    let didTimeOut = false;

    const timeoutId = window.setTimeout(() => {
      didTimeOut = true;
      controller.abort();
    }, SESSION_TIMEOUT_MS);

    setSessionError(null);
    setStatus((current) =>
      blocking ? "loading" : current === "error" ? "idle" : current,
    );

    getCurrentUser(controller.signal)
      .then((currentUser) => {
        if (
          !isMountedRef.current ||
          attempt !== verificationAttemptRef.current
        ) {
          return;
        }

        setUser(currentUser);
        setStatus("authenticated");
        setSessionError(null);
      })
      .catch((error: unknown) => {
        if (
          !isMountedRef.current ||
          attempt !== verificationAttemptRef.current
        ) {
          return;
        }

        setUser(null);

        if (!didTimeOut && error instanceof ApiError && error.status === 401) {
          setStatus("unauthenticated");
          setSessionError(null);
          return;
        }

        setStatus("error");
        setSessionError(SESSION_ERROR_MESSAGE);
      })
      .finally(() => {
        window.clearTimeout(timeoutId);

        // Solo la verificación vigente libera el estado compartido; una
        // respuesta vieja no debe pisar el flag de la nueva.
        if (attempt === verificationAttemptRef.current) {
          verificationInFlightRef.current = false;
          verificationControllerRef.current = null;
        }
      });
  }, []);

  useEffect(() => {
    if (status !== "idle") {
      return;
    }

    // En rutas públicas la verificación no bloquea el formulario.
    // El cambio de estado es intencional: marca que la verificación ya comenzó.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    verifySession(!isPublicRoute);
  }, [status, isPublicRoute, verifySession]);

  const retrySession = useCallback(() => {
    verifySession(!isPublicAuthRoute(pathname));
  }, [pathname, verifySession]);

  const login = useCallback(async (email: string, password: string) => {
    const authenticated = await loginRequest({ email, password });
    // Invalida una verificación en segundo plano que aún pudiera responder.
    verificationAttemptRef.current += 1;
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
      retrySession,
    }),
    [
      status,
      user,
      sessionError,
      login,
      logout,
      changePassword,
      markSessionExpired,
      retrySession,
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
