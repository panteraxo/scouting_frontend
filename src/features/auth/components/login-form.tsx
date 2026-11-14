"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { TextField } from "@/components/ui/form-field";
import { Spinner } from "@/components/ui/loading";
import { ApiError } from "@/lib/api-client";
import { useAuth } from "../auth-provider";
import { AuthLayout } from "./auth-layout";

interface LoginFieldErrors {
  email?: string;
  password?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function loginErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "No se pudo iniciar sesión. Intenta nuevamente.";
  }

  if (error.status === 401) {
    return "Correo o contraseña incorrectos, o la cuenta no está habilitada.";
  }

  return error.message;
}

export function LoginForm() {
  const { login, status, user, sessionError, retrySession } = useAuth();
  const router = useRouter();
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (status === "authenticated" && user) {
      router.replace(
        user.mustChangePassword ? "/cambiar-password" : "/inicio",
      );
    }
  }, [status, user, router]);

  const sessionWarning =
    status === "error"
      ? (sessionError ??
        "No pudimos verificar tu sesión. Revisa tu conexión e inténtalo de nuevo.")
      : sessionError;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const errors: LoginFieldErrors = {};

    if (!email) {
      errors.email = "Ingresa tu correo.";
    } else if (!EMAIL_PATTERN.test(email)) {
      errors.email = "Ingresa un correo válido.";
    }

    if (!password) {
      errors.password = "Ingresa tu contraseña.";
    }

    if (errors.email || errors.password) {
      setFieldErrors(errors);
      setFormError(null);
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setIsSubmitting(true);

    try {
      const authenticated = await login(email, password);
      router.replace(
        authenticated.mustChangePassword ? "/cambiar-password" : "/inicio",
      );
    } catch (error) {
      setFormError(loginErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Acceso"
      title="Inicia sesión"
      subtitle="Ingresa con el correo registrado en tu cuenta de Scouting.pe."
      footer={
        <span>
          ¿Eres ojeador y aún no tienes cuenta?{" "}
          <Link href="/registro/ojeador">Solicita tu registro</Link>
        </span>
      }
    >
      {sessionWarning ? (
        <Alert variant="warning" title="Sesión no disponible">
          <p>{sessionWarning}</p>
          <button
            className="button buttonSmall buttonSecondary"
            type="button"
            onClick={retrySession}
          >
            Reintentar
          </button>
        </Alert>
      ) : null}

      {formError ? (
        <Alert variant="error" title="No se pudo iniciar sesión">
          <p>{formError}</p>
        </Alert>
      ) : null}

      <form className="form" method="post" onSubmit={handleSubmit} noValidate>
        <TextField
          label="Correo electrónico"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="nombre@ejemplo.com"
          error={fieldErrors.email}
          disabled={isSubmitting}
          required
        />

        <TextField
          label="Contraseña"
          name="password"
          type="password"
          autoComplete="current-password"
          error={fieldErrors.password}
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
            {isSubmitting ? "Ingresando…" : "Iniciar sesión"}
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}
