"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import {
  DashboardSkeleton,
  LoadingScreen,
  StatePanel,
} from "@/components/ui/loading";
import { useAuth } from "@/features/auth/auth-provider";
import { DashboardShell } from "@/features/auth/components/dashboard-shell";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { status, user, sessionError, retrySession } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }

    if (status === "authenticated" && user?.mustChangePassword) {
      router.replace("/cambiar-password");
    }
  }, [status, user, router]);

  if (status === "idle" || status === "loading") {
    return <DashboardSkeleton />;
  }

  if (status === "error") {
    return (
      <main className="page">
        <div role="alert">
          <StatePanel
            title="No pudimos verificar tu sesión"
            action={
              <button
                className="button buttonPrimary buttonSmall"
                type="button"
                onClick={retrySession}
              >
                Reintentar
              </button>
            }
          >
            <p>
              {sessionError ??
                "No pudimos verificar tu sesión. Revisa tu conexión e inténtalo de nuevo."}
            </p>
          </StatePanel>
        </div>
      </main>
    );
  }

  if (status === "unauthenticated" || !user) {
    return <LoadingScreen message="Redirigiendo al inicio de sesión…" />;
  }

  if (user.mustChangePassword) {
    return (
      <LoadingScreen message="Debes cambiar tu contraseña temporal…" />
    );
  }

  return <DashboardShell>{children}</DashboardShell>;
}
