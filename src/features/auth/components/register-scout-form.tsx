"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { SelectField, TextField } from "@/components/ui/form-field";
import { Spinner } from "@/components/ui/loading";
import { ApiError } from "@/lib/api-client";
import type { DocumentType } from "@/types/api";
import { registerScoutRequest } from "../auth-api";
import { AuthLayout } from "./auth-layout";

type FieldErrors = Record<string, string>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DOCUMENT_PATTERN = /^[A-Za-z0-9-]{4,30}$/;
const PHONE_PATTERN = /^[0-9+()\-\s]{6,20}$/;
const USERNAME_PATTERN = /^[A-Za-z0-9._-]{3,30}$/;

export function RegisterScoutForm() {
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const firstName = String(formData.get("firstName") ?? "").trim();
    const lastName = String(formData.get("lastName") ?? "").trim();
    const documentType = String(formData.get("documentType") ?? "");
    const documentNumber = String(formData.get("documentNumber") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const username = String(formData.get("username") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");
    const errors: FieldErrors = {};

    if (!firstName) {
      errors.firstName = "Ingresa tus nombres.";
    } else if (firstName.length > 100) {
      errors.firstName = "Los nombres no deben superar 100 caracteres.";
    }

    if (!lastName) {
      errors.lastName = "Ingresa tus apellidos.";
    } else if (lastName.length > 100) {
      errors.lastName = "Los apellidos no deben superar 100 caracteres.";
    }

    if (!["DNI", "CE", "PASSPORT"].includes(documentType)) {
      errors.documentType = "Selecciona un tipo de documento.";
    }

    if (!documentNumber) {
      errors.documentNumber = "Ingresa tu número de documento.";
    } else if (!DOCUMENT_PATTERN.test(documentNumber)) {
      errors.documentNumber =
        "Usa entre 4 y 30 caracteres: letras, números o guiones.";
    }

    if (!email) {
      errors.email = "Ingresa tu correo.";
    } else if (!EMAIL_PATTERN.test(email)) {
      errors.email = "Ingresa un correo válido.";
    } else if (email.length > 150) {
      errors.email = "El correo no debe superar 150 caracteres.";
    }

    if (phone && !PHONE_PATTERN.test(phone)) {
      errors.phone =
        "Usa entre 6 y 20 caracteres: números, espacios, +, ( ) o guiones.";
    }

    if (!username) {
      errors.username = "Ingresa un nombre de usuario.";
    } else if (!USERNAME_PATTERN.test(username)) {
      errors.username =
        "Usa entre 3 y 30 caracteres: letras, números, punto, guion o guion bajo.";
    }

    if (!password) {
      errors.password = "Ingresa una contraseña.";
    } else if (password.length < 8 || password.length > 72) {
      errors.password = "La contraseña debe tener entre 8 y 72 caracteres.";
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Confirma tu contraseña.";
    } else if (password !== confirmPassword) {
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
      await registerScoutRequest({
        firstName,
        lastName,
        documentType: documentType as DocumentType,
        documentNumber,
        email,
        phone: phone || null,
        username,
        password,
      });

      form.reset();
      setIsRegistered(true);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.fieldErrors) {
          setFieldErrors(error.fieldErrors);
          setFormError("Revisa los campos marcados e intenta nuevamente.");
        } else {
          setFormError(error.message);
        }
      } else {
        setFormError(
          "No se pudo enviar la solicitud. Intenta nuevamente en unos minutos.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isRegistered) {
    return (
      <AuthLayout
        eyebrow="Registro de ojeador"
        title="Solicitud enviada"
        subtitle="Tu solicitud quedó registrada para revisión."
      >
        <Alert variant="success" title="Solicitud registrada">
          <p>
            Un administrador revisará la cuenta para habilitarla. No se inicia
            sesión automáticamente.
          </p>
          <p>
            Por seguridad, no se indica si el correo, documento o nombre de
            usuario ya estaban registrados.
          </p>
        </Alert>

        <div className="formActions">
          <Link className="button buttonPrimary" href="/login">
            Ir a iniciar sesión
          </Link>
          <Link className="button buttonSecondary" href="/">
            Volver al inicio
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      eyebrow="Registro de ojeador"
      title="Solicita tu cuenta"
      subtitle="Completa tus datos personales. Un administrador debe aprobar la cuenta antes de que puedas iniciar sesión."
      footer={
        <span>
          ¿Ya tienes una cuenta habilitada?{" "}
          <Link href="/login">Inicia sesión</Link>
        </span>
      }
    >
      <Alert variant="info" title="Solo solicitudes de ojeador">
        <p>
          El registro público crea una cuenta con rol Ojeador en estado
          pendiente. No permite elegir rol, academia ni club, y no inicia sesión.
        </p>
      </Alert>

      {formError ? (
        <Alert variant="error" title="No se pudo enviar la solicitud">
          <p>{formError}</p>
        </Alert>
      ) : null}

      <form className="form" onSubmit={handleSubmit} noValidate>
        <div className="formGrid">
          <TextField
            label="Nombres"
            name="firstName"
            autoComplete="given-name"
            error={fieldErrors.firstName}
            disabled={isSubmitting}
            required
          />
          <TextField
            label="Apellidos"
            name="lastName"
            autoComplete="family-name"
            error={fieldErrors.lastName}
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="formGrid">
          <SelectField
            label="Tipo de documento"
            name="documentType"
            defaultValue="DNI"
            error={fieldErrors.documentType}
            disabled={isSubmitting}
            required
          >
            <option value="DNI">DNI</option>
            <option value="CE">Carné de extranjería</option>
            <option value="PASSPORT">Pasaporte</option>
          </SelectField>
          <TextField
            label="Número de documento"
            name="documentNumber"
            autoComplete="off"
            error={fieldErrors.documentNumber}
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="formGrid">
          <TextField
            label="Correo electrónico"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="nombre@ejemplo.com"
            error={fieldErrors.email}
            disabled={isSubmitting}
            required
          />
          <TextField
            label="Teléfono"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="987654321"
            hint="Opcional. Si lo informas, usa entre 6 y 20 caracteres: números, espacios, +, ( ) o guiones."
            error={fieldErrors.phone}
            disabled={isSubmitting}
          />
        </div>

        <TextField
          label="Nombre de usuario"
          name="username"
          autoComplete="username"
          hint="Se usa para identificarte en la plataforma."
          error={fieldErrors.username}
          disabled={isSubmitting}
          required
        />

        <div className="formGrid">
          <TextField
            label="Contraseña"
            name="password"
            type="password"
            autoComplete="new-password"
            hint="Entre 8 y 72 caracteres."
            error={fieldErrors.password}
            disabled={isSubmitting}
            required
          />
          <TextField
            label="Confirmar contraseña"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            error={fieldErrors.confirmPassword}
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="formActions">
          <button
            className="button buttonPrimary buttonBlock"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? <Spinner /> : null}
            {isSubmitting ? "Enviando solicitud…" : "Enviar solicitud"}
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}
