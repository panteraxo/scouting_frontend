"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { LoadingScreen } from "@/components/ui/loading";
import { useAuth } from "@/features/auth/auth-provider";
import { DashboardShell } from "@/features/auth/components/dashboard-shell";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { status, user } = useAuth();
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

  if (status === "loading") {
    return <LoadingScreen message="Verificando sesión…" />;
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
