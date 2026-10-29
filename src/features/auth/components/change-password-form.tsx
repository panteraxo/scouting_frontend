"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { TextField } from "@/components/ui/form-field";
import { LoadingScreen, Spinner } from "@/components/ui/loading";
import { ApiError } from "@/lib/api-client";
import { useAuth } from "../auth-provider";
import { AuthLayout } from "./auth-layout";

interface PasswordFieldErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

export function ChangePasswordForm() {
  const { status, user, changePassword, logout, markSessionExpired } = useAuth();
  const router = useRouter();
  const [fieldErrors, setFieldErrors] = useState<PasswordFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isUpdated, setIsUpdated] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return <LoadingScreen message="Verificando sesión…" />;
  }

  if (status === "unauthenticated" || !user) {
    return <LoadingScreen message="Redirigiendo al inicio de sesión…" />;
  }

  const mustChangePassword = user.mustChangePassword;

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await logout();
      router.replace("/login");
    } finally {
      setIsLoggingOut(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const currentPassword = String(formData.get("currentPassword") ?? "");
    const newPassword = String(formData.get("newPassword") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");
    const errors: PasswordFieldErrors = {};

    if (!currentPassword) {
      errors.currentPassword = "Ingresa tu contraseña actual.";
    }

    if (!newPassword) {
      errors.newPassword = "Ingresa una nueva contraseña.";
    } else if (newPassword.length < 8 || newPassword.length > 72) {
      errors.newPassword =
        "La nueva contraseña debe tener entre 8 y 72 caracteres.";
    } else if (newPassword === currentPassword) {
      errors.newPassword = "La nueva contraseña debe ser diferente a la actual.";
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Confirma tu nueva contraseña.";
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = "Las contraseñas no coinciden.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormError(null);
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setIsSubmitting(true);

    try {
      await changePassword({ currentPassword, newPassword });
      form.reset();
      setIsUpdated(true);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          markSessionExpired();
          return;
        }

        if (error.code === "INVALID_CURRENT_PASSWORD") {
          setFieldErrors({
            currentPassword: "La contraseña actual no es correcta.",
          });
          setFormError(null);
          return;
        }

        if (error.code === "PASSWORD_UNCHANGED") {
          setFieldErrors({
            newPassword: "La nueva contraseña debe ser diferente a la actual.",
          });
          setFormError(null);
          return;
        }

        setFormError(error.message);
      } else {
        setFormError(
          "No se pudo cambiar la contraseña. Intenta nuevamente en unos minutos.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isUpdated) {
    return (
      <AuthLayout
        eyebrow="Seguridad de la cuenta"
        title="Contraseña actualizada"
        subtitle="Tu nueva contraseña ya está activa."
      >
        <Alert variant="success" title="Cambio completado">
          <p>
            La contraseña temporal fue reemplazada. Ya puedes usar el dashboard
            con normalidad.
          </p>
        </Alert>

        <div className="formActions">
          <Link className="button buttonPrimary" href="/inicio">
            Ir al dashboard
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      eyebrow="Seguridad de la cuenta"
      title={mustChangePassword ? "Cambia tu contraseña temporal" : "Cambiar contraseña"}
      subtitle={
        mustChangePassword
          ? "Por seguridad, debes reemplazar la contraseña temporal antes de continuar."
          : "Actualiza la contraseña de tu cuenta."
      }
      footer={
        <span>
          Sesión iniciada como <strong>{user.email}</strong>
        </span>
      }
    >
      {mustChangePassword ? (
        <Alert variant="warning" title="Cambio obligatorio">
          <p>
            Mientras no cambies la contraseña temporal, el resto de módulos del
            dashboard permanecerá bloqueado.
          </p>
        </Alert>
      ) : null}

      {formError ? (
        <Alert variant="error" title="No se pudo cambiar la contraseña">
          <p>{formError}</p>
        </Alert>
      ) : null}

      <form className="form" onSubmit={handleSubmit} noValidate>
        <TextField
          label="Contraseña actual"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          error={fieldErrors.currentPassword}
          disabled={isSubmitting}
          required
        />

        <TextField
          label="Nueva contraseña"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          hint="Entre 8 y 72 caracteres."
          error={fieldErrors.newPassword}
          disabled={isSubmitting}
          required
        />

        <TextField
          label="Confirmar nueva contraseña"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          error={fieldErrors.confirmPassword}
          disabled={isSubmitting}
          required
        />

        <div className="formActions">
          <button
            className="button buttonPrimary buttonBlock"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? <Spinner /> : null}
            {isSubmitting ? "Actualizando…" : "Actualizar contraseña"}
          </button>
        </div>
      </form>

      <div className="authSecondaryAction">
        <button
          className="button buttonGhost buttonSmall"
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut || isSubmitting}
        >
          {isLoggingOut ? "Cerrando sesión…" : "Cerrar sesión"}
        </button>
      </div>
    </AuthLayout>
  );
}
