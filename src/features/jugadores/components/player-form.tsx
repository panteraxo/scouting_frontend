"use client";

import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";
import { Alert } from "@/components/ui/alert";
import { TextAreaField, TextField, SelectField } from "@/components/ui/form-field";
import { Spinner } from "@/components/ui/loading";
import { UbigeoFields } from "@/features/organizations/components/ubigeo-fields";
import { useAuth } from "@/features/auth/auth-provider";
import { UserIdentityFields } from "@/features/usuarios/components/user-identity-fields";
import {
  EMPTY_IDENTITY,
  identityPayload,
  validateIdentity,
  type IdentityFormValues,
} from "@/features/usuarios/form";
import { ApiError } from "@/lib/api-client";
import type {
  DominantFoot,
  PlayerAccountCreateInput,
  PlayerCreateInput,
  PlayerDetailResponse,
  PlayerPosition,
  PlayerUpdateInput,
} from "@/types/api";
import {
  DOMINANT_FOOT_OPTIONS,
  POSITION_OPTIONS,
} from "../catalogs";
import type { PlayerAcademyOption } from "../players-api";

const PHOTO_URL_MAX = 500;

type FieldErrors = Record<string, string>;

interface PlayerFormState {
  birthDate: string;
  residenceUbigeoCode: string;
  heightCm: string;
  weightKg: string;
  position: string;
  bestPosition: string;
  dominantFoot: string;
  summary: string;
  photoUrl: string;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function buildInitial(initial?: PlayerDetailResponse): PlayerFormState {
  const full = initial && "birthDate" in initial ? initial : null;
  return {
    birthDate: full?.birthDate ?? "",
    residenceUbigeoCode:
      full && "residence" in full
        ? full.residence?.districtCode ??
          ""
        : "",
    heightCm:
      typeof initial?.heightCm === "number" ? String(initial.heightCm) : "",
    weightKg:
      typeof initial?.weightKg === "number" ? String(initial.weightKg) : "",
    position: initial?.position ?? "",
    bestPosition: initial?.bestPosition ?? "",
    dominantFoot: initial?.dominantFoot ?? "",
    summary: initial?.summary ?? "",
    photoUrl: initial?.photoUrl ?? "",
  };
}

function isMinor(birthDate: string): boolean {
  if (!birthDate) {
    return false;
  }
  const date = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return false;
  }
  const today = new Date();
  const age =
    today.getFullYear() -
    date.getFullYear() -
    (today.getMonth() < date.getMonth() ||
    (today.getMonth() === date.getMonth() &&
      today.getDate() < date.getDate())
      ? 1
      : 0);
  return age < 18;
}

function validate(state: PlayerFormState): FieldErrors {
  const errors: FieldErrors = {};
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);

  if (!state.birthDate) {
    errors.birthDate = "Ingresa la fecha de nacimiento.";
  } else if (state.birthDate > todayIso) {
    errors.birthDate = "La fecha de nacimiento no puede ser futura.";
  } else if (state.birthDate < "1900-01-01") {
    errors.birthDate = "La fecha de nacimiento no es válida.";
  }

  if (!state.residenceUbigeoCode) {
    errors.residenceUbigeoCode = "Selecciona el distrito de residencia.";
  } else if (!/^\d{6}$/.test(state.residenceUbigeoCode)) {
    errors.residenceUbigeoCode =
      "Selecciona un distrito de la lista de ubicaciones.";
  }

  if (state.heightCm.trim()) {
    const height = Number(state.heightCm);
    if (!Number.isInteger(height) || height < 80 || height > 250) {
      errors.heightCm = "La talla debe ser un entero entre 80 y 250 cm.";
    }
  }

  if (state.weightKg.trim()) {
    const rawWeight = state.weightKg.trim();
    if (!/^\d{1,3}(\.\d{1,2})?$/.test(rawWeight)) {
      errors.weightKg =
        "El peso admite como máximo dos decimales (por ejemplo, 64.1).";
    } else {
      const weight = Number(rawWeight);
      if (!Number.isFinite(weight) || weight < 20 || weight > 200) {
        errors.weightKg = "El peso debe estar entre 20 y 200 kg.";
      }
    }
  }

  if (!state.position) {
    errors.position = "Selecciona la posición.";
  }

  if (!state.dominantFoot) {
    errors.dominantFoot = "Selecciona el pie dominante.";
  }

  if (state.summary.trim().length > 2000) {
    errors.summary = "El resumen no debe superar 2000 caracteres.";
  }

  if (state.photoUrl.trim()) {
    if (!isHttpUrl(state.photoUrl.trim())) {
      errors.photoUrl = "Ingresa un enlace web válido para la foto.";
    } else if (state.photoUrl.trim().length > PHOTO_URL_MAX) {
      errors.photoUrl = `El enlace de la foto no debe superar ${PHOTO_URL_MAX} caracteres.`;
    }
  }

  return errors;
}

function nullableString(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function nullableNumber(value: string): number | null {
  return value.trim() ? Number(value) : null;
}

export type PlayerFormMode = "create" | "create-account" | "edit";

export type PlayerFormSubmitInput =
  | PlayerCreateInput
  | PlayerUpdateInput
  | PlayerAccountCreateInput;

export function PlayerForm({
  mode,
  initial,
  selectedUserId,
  academyOptions,
  academyRequired,
  academyError,
  submitLabel,
  cancelHref,
  onSubmit,
  warning,
}: {
  mode: PlayerFormMode;
  initial?: PlayerDetailResponse;
  selectedUserId?: number;
  /** Academias activas disponibles cuando el actor es ADMIN. */
  academyOptions?: PlayerAcademyOption[];
  /** ADMIN debe elegir la academia; el staff la deriva de su cuenta. */
  academyRequired?: boolean;
  academyError?: string | null;
  submitLabel: string;
  cancelHref: string;
  onSubmit: (
    input: PlayerFormSubmitInput,
  ) => Promise<PlayerDetailResponse | undefined>;
  warning?: ReactNode;
}) {
  const { markSessionExpired } = useAuth();
  const [state, setState] = useState<PlayerFormState>(() =>
    buildInitial(initial),
  );
  const [identity, setIdentity] =
    useState<IdentityFormValues>(EMPTY_IDENTITY);
  const [academyId, setAcademyId] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const minor = isMinor(state.birthDate);

  function update<K extends keyof PlayerFormState>(
    key: K,
    value: PlayerFormState[K],
  ) {
    setState((current) => ({ ...current, [key]: value }));
  }

  function updateIdentity(field: keyof IdentityFormValues, value: string) {
    setIdentity((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function updateAcademy(value: string) {
    setAcademyId(value);
    setFieldErrors((current) => {
      if (!current.academyId) {
        return current;
      }

      const next = { ...current };
      delete next.academyId;
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    if (mode === "create" && !selectedUserId) {
      setFormError("Selecciona una cuenta PLAYER sin perfil.");
      return;
    }

    if (mode === "edit" && !initial) {
      setFormError("No se pudo cargar el perfil para editar.");
      return;
    }

    const errors: FieldErrors =
      mode === "create-account" ? validateIdentity(identity) : {};

    if (mode === "create-account" && academyRequired && !academyId) {
      errors.academyId = "Selecciona una academia activa.";
    }

    Object.assign(errors, validate(state));

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormError("Revisa los campos marcados e intenta nuevamente.");
      const firstError = Object.keys(errors)[0];
      document.getElementById(firstError)?.focus();
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setIsSubmitting(true);

    const base = {
      birthDate: state.birthDate,
      residenceUbigeoCode: state.residenceUbigeoCode,
      heightCm: nullableNumber(state.heightCm),
      weightKg: nullableNumber(state.weightKg),
      position: state.position as PlayerPosition,
      bestPosition: state.bestPosition
        ? (state.bestPosition as PlayerPosition)
        : null,
      dominantFoot: state.dominantFoot as DominantFoot,
      summary: nullableString(state.summary),
      photoUrl: nullableString(state.photoUrl),
    } satisfies Omit<PlayerCreateInput, "userId">;

    try {
      let payload: PlayerFormSubmitInput;

      if (mode === "create-account") {
        payload = {
          ...identityPayload(identity),
          ...base,
          ...(academyRequired && academyId
            ? { academyId: Number(academyId) }
            : {}),
        } satisfies PlayerAccountCreateInput;
      } else if (mode === "create") {
        payload = { ...base, userId: selectedUserId } as PlayerCreateInput;
      } else {
        payload = {
          ...base,
          version: initial && "version" in initial ? initial.version : 0,
        } as PlayerUpdateInput;
      }

      await onSubmit(payload);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          markSessionExpired();
          return;
        }

        if (error.fieldErrors) {
          setFieldErrors(error.fieldErrors);
          setFormError("Revisa los campos marcados e intenta nuevamente.");
          const firstError = Object.keys(error.fieldErrors).find(
            (key) => document.getElementById(key) !== null,
          );
          if (firstError) {
            document.getElementById(firstError)?.focus();
          }
        } else {
          setFormError(error.message);
        }
      } else {
        setFormError(
          "No se pudo guardar el perfil. Intenta nuevamente en unos minutos.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      {formError ? (
        <Alert variant="error" title="No se pudo guardar">
          <p>{formError}</p>
        </Alert>
      ) : null}

      {warning}

      {mode === "create-account" ? (
        <section className="formSection" aria-labelledby="player-account-data">
          <h2 className="formSectionTitle" id="player-account-data">
            Datos de la cuenta
          </h2>
          <p className="formSectionNote">
            La cuenta se crea con rol Jugador y una contraseña temporal de un solo
            uso que se mostrará al guardar. El tipo y número de documento son
            obligatorios; el teléfono es opcional.
          </p>

          <UserIdentityFields
            values={identity}
            errors={fieldErrors}
            disabled={isSubmitting}
            onChange={updateIdentity}
          />

          {academyRequired ? (
            <SelectField
              label="Academia activa"
              name="academyId"
              value={academyId}
              onChange={(event) => updateAcademy(event.target.value)}
              error={fieldErrors.academyId}
              hint={
                academyError ??
                "Solo se muestran academias activas. La cuenta y el perfil quedarán asignados a esta academia."
              }
              disabled={isSubmitting}
              required
            >
              <option value="">Selecciona una academia</option>
              {(academyOptions ?? []).map((academy) => (
                <option key={academy.id} value={academy.id}>
                  {academy.name} ({academy.code})
                </option>
              ))}
            </SelectField>
          ) : (
            <p className="fieldHint">
              La cuenta se asignará a tu academia. La academia se asigna
              automáticamente a partir de tu cuenta.
            </p>
          )}
        </section>
      ) : null}

      {minor ? (
        <Alert variant="info" title="Jugador menor de edad">
          <p>
            El perfil quedará incompleto hasta que se registre al tutor. La
            completitud no exige consentimiento: el consentimiento del tutor se
            exige para compartir datos con clubes. El Administrador no registra
            datos del tutor; esa acción corresponde al Profesor o Director de la
            academia.
          </p>
        </Alert>
      ) : null}

      <section className="formSection" aria-labelledby="player-main-data">
        <h2 className="formSectionTitle" id="player-main-data">
          Datos del perfil
        </h2>

        <div className="formGrid">
          <TextField
            label="Fecha de nacimiento"
            name="birthDate"
            type="date"
            value={state.birthDate}
            onChange={(event) => update("birthDate", event.target.value)}
            error={fieldErrors.birthDate}
            disabled={isSubmitting}
            required
          />

          <TextField
            label="Talla (cm)"
            name="heightCm"
            type="number"
            min={80}
            max={250}
            value={state.heightCm}
            onChange={(event) => update("heightCm", event.target.value)}
            error={fieldErrors.heightCm}
            hint="Opcional. Entre 80 y 250 cm."
            disabled={isSubmitting}
          />
        </div>

        <div className="formGrid">
          <TextField
            label="Peso (kg)"
            name="weightKg"
            type="number"
            min={20}
            max={200}
            step="0.01"
            value={state.weightKg}
            onChange={(event) => update("weightKg", event.target.value)}
            error={fieldErrors.weightKg}
            hint="Opcional. Entre 20 y 200 kg."
            disabled={isSubmitting}
          />

          <SelectField
            label="Pie dominante"
            name="dominantFoot"
            value={state.dominantFoot}
            onChange={(event) => update("dominantFoot", event.target.value)}
            error={fieldErrors.dominantFoot}
            disabled={isSubmitting}
            required
          >
            <option value="">Selecciona una opción</option>
            {DOMINANT_FOOT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </div>

        <div className="formGrid">
          <SelectField
            label="Posición"
            name="position"
            value={state.position}
            onChange={(event) => update("position", event.target.value)}
            error={fieldErrors.position}
            disabled={isSubmitting}
            required
          >
            <option value="">Selecciona una posición</option>
            {POSITION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} ({option.group})
              </option>
            ))}
          </SelectField>

          <SelectField
            label="Mejor posición"
            name="bestPosition"
            value={state.bestPosition}
            onChange={(event) => update("bestPosition", event.target.value)}
            error={fieldErrors.bestPosition}
            hint="Opcional."
            disabled={isSubmitting}
          >
            <option value="">Sin posición secundaria</option>
            {POSITION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} ({option.group})
              </option>
            ))}
          </SelectField>
        </div>
      </section>

      <section className="formSection" aria-labelledby="player-residence">
        <h2 className="formSectionTitle" id="player-residence">
          Residencia
        </h2>
        <p className="formSectionNote">
          Distrito de residencia del jugador, independiente de la ubicación de
          su academia.
        </p>

        <UbigeoFields
          ubigeoCode={state.residenceUbigeoCode}
          disabled={isSubmitting}
          error={fieldErrors.residenceUbigeoCode}
          onChange={(code) => update("residenceUbigeoCode", code)}
        />
      </section>

      <section className="formSection" aria-labelledby="player-extra">
        <h2 className="formSectionTitle" id="player-extra">
          Información adicional
        </h2>

        <TextField
          label="Enlace de la foto"
          name="photoUrl"
          type="url"
          value={state.photoUrl}
          onChange={(event) => update("photoUrl", event.target.value)}
          error={fieldErrors.photoUrl}
          hint="Opcional. Solo enlaces web; no se suben archivos."
          disabled={isSubmitting}
        />

        <TextAreaField
          label="Resumen"
          name="summary"
          value={state.summary}
          onChange={(event) => update("summary", event.target.value)}
          error={fieldErrors.summary}
          maxLength={2000}
          rows={4}
          hint="Opcional. Máximo 2000 caracteres."
          disabled={isSubmitting}
        />
      </section>

      <div className="formActions">
        <button
          className="button buttonPrimary"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? <Spinner /> : null}
          {isSubmitting ? "Guardando…" : submitLabel}
        </button>
        <Link className="button buttonSecondary" href={cancelHref}>
          Cancelar
        </Link>
      </div>

      <p className="footnote">
        {mode === "create-account"
          ? academyRequired
            ? "La cuenta y el perfil se crean en un solo paso. Los años de experiencia, estados, autoría y datos del tutor se gestionan fuera de este formulario."
            : "La cuenta y el perfil se crean en un solo paso. La academia se asigna automáticamente a partir de tu cuenta; los años de experiencia, estados, autoría y datos del tutor se gestionan fuera de este formulario."
          : "La academia se asigna automáticamente a partir de la cuenta del jugador. Los años de experiencia, estados, autoría y datos del tutor se gestionan fuera de este formulario."}
      </p>
    </form>
  );
}
