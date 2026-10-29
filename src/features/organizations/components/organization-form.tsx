"use client";

import Link from "next/link";
import {
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Alert } from "@/components/ui/alert";
import { TextAreaField, TextField, SelectField } from "@/components/ui/form-field";
import { Spinner } from "@/components/ui/loading";
import { useAuth } from "@/features/auth/auth-provider";
import { ApiError } from "@/lib/api-client";
import type {
  OrganizationInput,
  OrganizationKind,
  OrganizationResponse,
} from "@/types/api";
import { kindTitle } from "../labels";
import { UbigeoFields } from "./ubigeo-fields";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RUC_PATTERN = /^\d{11}$/;
const CURRENT_YEAR = new Date().getFullYear();

const TYPE_OPTIONS: Record<OrganizationKind, readonly string[]> = {
  academy: [
    "Academia formativa",
    "Academia de futbol",
    "Academia de alto rendimiento",
  ],
  club: ["Club deportivo", "Club de futbol"],
};

const LIMITS = {
  name: 150,
  type: 100,
  description: 2000,
  address: 300,
  email: 150,
  phone: 30,
  headquarters: 200,
  representative: 150,
} as const;

type FieldErrors = Record<string, string>;

interface FormState {
  name: string;
  logoUrl: string;
  type: string;
  description: string;
  foundationYear: string;
  ruc: string;
  ubigeoCode: string;
  address: string;
  institutionalEmail: string;
  institutionalPhone: string;
  websiteUrl: string;
  instagramUrl: string;
  facebookUrl: string;
  youtubeUrl: string;
  tiktokUrl: string;
  headquarters: string;
  representativeName: string;
}

function text(value: string | null | undefined): string {
  return value ?? "";
}

function buildInitialState(initial?: OrganizationResponse): FormState {
  return {
    name: text(initial?.name),
    logoUrl: text(initial?.logoUrl),
    type: text(initial?.type),
    description: text(initial?.description),
    foundationYear:
      typeof initial?.foundationYear === "number"
        ? String(initial.foundationYear)
        : "",
    ruc: text(initial?.ruc),
    ubigeoCode: text(initial?.ubigeoCode),
    address: text(initial?.address),
    institutionalEmail: text(initial?.institutionalEmail),
    institutionalPhone: text(initial?.institutionalPhone),
    websiteUrl: text(initial?.websiteUrl),
    instagramUrl: text(initial?.instagramUrl),
    facebookUrl: text(initial?.facebookUrl),
    youtubeUrl: text(initial?.youtubeUrl),
    tiktokUrl: text(initial?.tiktokUrl),
    headquarters: text(initial?.headquarters),
    representativeName: text(initial?.representativeName),
  };
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function validate(state: FormState, kind: OrganizationKind): FieldErrors {
  const errors: FieldErrors = {};
  const name = state.name.trim();
  const type = state.type.trim();
  const description = state.description.trim();
  const address = state.address.trim();
  const email = state.institutionalEmail.trim();
  const phone = state.institutionalPhone.trim();
  const ruc = state.ruc.trim();

  if (!name) {
    errors.name = "Ingresa el nombre de la organización.";
  } else if (name.length < 2) {
    errors.name = "El nombre debe tener al menos 2 caracteres.";
  } else if (name.length > LIMITS.name) {
    errors.name = `El nombre no debe superar ${LIMITS.name} caracteres.`;
  }

  if (!state.logoUrl.trim()) {
    errors.logoUrl = "Ingresa el enlace del logo.";
  }

  if (!type) {
    errors.type = "Ingresa el tipo de organización.";
  } else if (type.length > LIMITS.type) {
    errors.type = `El tipo no debe superar ${LIMITS.type} caracteres.`;
  }

  if (!state.foundationYear.trim()) {
    errors.foundationYear = "Ingresa el año de fundación.";
  } else {
    const year = Number(state.foundationYear);
    if (
      !/^\d{4}$/.test(state.foundationYear) ||
      !Number.isInteger(year) ||
      year < 1800 ||
      year > CURRENT_YEAR
    ) {
      errors.foundationYear = `Ingresa un año entre 1800 y ${CURRENT_YEAR}.`;
    }
  }

  if (!ruc) {
    errors.ruc = "Ingresa el RUC.";
  } else if (!RUC_PATTERN.test(ruc)) {
    errors.ruc = "El RUC debe tener exactamente 11 dígitos.";
  }

  if (!state.ubigeoCode) {
    errors.ubigeoCode = "Selecciona un distrito.";
  } else if (!/^\d{6}$/.test(state.ubigeoCode)) {
    errors.ubigeoCode = "Selecciona un distrito de la lista de ubicaciones.";
  }

  if (!description) {
    errors.description = "Ingresa la descripción.";
  } else if (description.length > LIMITS.description) {
    errors.description = `La descripción no debe superar ${LIMITS.description} caracteres.`;
  }

  if (!address) {
    errors.address = "Ingresa la dirección.";
  } else if (address.length > LIMITS.address) {
    errors.address = `La dirección no debe superar ${LIMITS.address} caracteres.`;
  }

  if (!email) {
    errors.institutionalEmail = "Ingresa el correo institucional.";
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.institutionalEmail = "Ingresa un correo institucional válido.";
  } else if (email.length > LIMITS.email) {
    errors.institutionalEmail = `El correo no debe superar ${LIMITS.email} caracteres.`;
  }

  if (!phone) {
    errors.institutionalPhone = "Ingresa el teléfono institucional.";
  } else if (phone.length > LIMITS.phone) {
    errors.institutionalPhone = `El teléfono no debe superar ${LIMITS.phone} caracteres.`;
  }

  const urls: Array<[keyof FormState, string]> = [
    ["logoUrl", "el logo"],
    ["websiteUrl", "el sitio web"],
    ["instagramUrl", "Instagram"],
    ["facebookUrl", "Facebook"],
    ["youtubeUrl", "YouTube"],
    ["tiktokUrl", "TikTok"],
  ];

  for (const [field, label] of urls) {
    const raw = String(state[field] ?? "").trim();

    if (!raw) {
      continue;
    }

    if (!isHttpUrl(raw)) {
      errors[field] = `Ingresa un enlace válido para ${label}.`;
    }
  }

  if (state.headquarters.trim().length > LIMITS.headquarters) {
    errors.headquarters = `La sede no debe superar ${LIMITS.headquarters} caracteres.`;
  }

  if (state.representativeName.trim().length > LIMITS.representative) {
    errors.representativeName = `El nombre del representante no debe superar ${LIMITS.representative} caracteres.`;
  }

  if (kind === "academy") {
    if (!state.headquarters.trim()) {
      errors.headquarters = "Ingresa la sede de la academia.";
    }
  }

  return errors;
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function buildInput(
  state: FormState,
  kind: OrganizationKind,
  mode: "create" | "edit",
): OrganizationInput {
  const input: OrganizationInput = {
    name: state.name.trim(),
    logoUrl: state.logoUrl.trim(),
    type: state.type.trim(),
    description: state.description.trim(),
    foundationYear: Number(state.foundationYear),
    ruc: state.ruc.trim(),
    ubigeoCode: state.ubigeoCode,
    address: state.address.trim(),
    institutionalEmail: state.institutionalEmail.trim(),
    institutionalPhone: state.institutionalPhone.trim(),
    websiteUrl: emptyToNull(state.websiteUrl),
    instagramUrl: emptyToNull(state.instagramUrl),
    facebookUrl: emptyToNull(state.facebookUrl),
    youtubeUrl: emptyToNull(state.youtubeUrl),
    tiktokUrl: emptyToNull(state.tiktokUrl),
  };

  if (kind === "academy") {
    input.headquarters = state.headquarters.trim();

    const representative = state.representativeName.trim();
    if (mode === "edit" && representative) {
      input.representativeName = representative;
    }
  }

  return input;
}

interface OrganizationFormProps {
  kind: OrganizationKind;
  mode: "create" | "edit";
  initial?: OrganizationResponse;
  submitLabel: string;
  cancelHref: string;
  warning?: ReactNode;
  /** Apila todas las secciones y campos en una sola columna. */
  singleColumn?: boolean;
  onSubmit: (
    input: OrganizationInput,
  ) => Promise<OrganizationResponse | undefined>;
  onSuccess?: (organization: OrganizationResponse | undefined) => void;
}

export function OrganizationForm({
  kind,
  mode,
  initial,
  submitLabel,
  cancelHref,
  warning,
  singleColumn = false,
  onSubmit,
  onSuccess,
}: OrganizationFormProps) {
  const { markSessionExpired } = useAuth();
  const [state, setState] = useState<FormState>(() =>
    buildInitialState(initial),
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const errors = validate(state, kind);

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

    try {
      const input = buildInput(state, kind, mode);
      if (kind === "academy" && mode === "edit" && initial?.trainingGroups) {
        // La UI ya no edita grupos formativos; se conservan los existentes.
        input.trainingGroups = initial.trainingGroups;
      }
      const result = await onSubmit(input);
      onSuccess?.(result);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          markSessionExpired();
          return;
        }

        if (error.fieldErrors) {
          setFieldErrors(error.fieldErrors);
          setFormError("Revisa los campos marcados e intenta nuevamente.");
        } else {
          setFormError(error.message);
        }
      } else {
        setFormError(
          "No se pudo guardar la organización. Intenta nuevamente en unos minutos.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const title = kindTitle(kind);
  const showSectionNumbers = singleColumn;
  const typeOptions = TYPE_OPTIONS[kind];
  const typeValue = state.type.trim();
  const legacyType =
    typeValue && !typeOptions.includes(typeValue) ? typeValue : null;

  return (
    <form
      className={`form${singleColumn ? " formSingleColumn" : ""}`}
      onSubmit={handleSubmit}
      noValidate
    >
      {formError ? (
        <Alert variant="error" title="No se pudo guardar">
          <p>{formError}</p>
        </Alert>
      ) : null}

      {warning}

      <section className="formSection" aria-labelledby="organization-main">
        <h2 className="formSectionTitle" id="organization-main">
          {showSectionNumbers ? (
            <span className="formSectionIndex" aria-hidden="true">
              1
            </span>
          ) : null}
          Información general
        </h2>

        <div className="formGrid">
          <TextField
            label="Nombre"
            name="name"
            value={state.name}
            onChange={(event) => update("name", event.target.value)}
            error={fieldErrors.name}
            maxLength={LIMITS.name}
            autoComplete="organization"
            disabled={isSubmitting}
            required
          />

          {mode === "edit" ? (
            <TextField
              label="Código"
              name="code"
              value={initial?.code ?? ""}
              readOnly
              disabled
              hint="Generado automáticamente; no se edita."
            />
          ) : null}
        </div>

        <div className="formGrid">
          <SelectField
            label="Tipo"
            name="type"
            value={typeValue}
            onChange={(event) => update("type", event.target.value)}
            error={fieldErrors.type}
            hint="Selecciona el tipo de organización."
            disabled={isSubmitting}
            required
          >
            <option value="">Selecciona un tipo</option>
            {typeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
            {legacyType ? (
              <option value={legacyType}>{legacyType} (valor actual)</option>
            ) : null}
          </SelectField>

          <TextField
            label="Año de fundación"
            name="foundationYear"
            value={state.foundationYear}
            onChange={(event) =>
              update(
                "foundationYear",
                event.target.value.replace(/\D/g, "").slice(0, 4),
              )
            }
            error={fieldErrors.foundationYear}
            inputMode="numeric"
            pattern="[0-9]{4}"
            maxLength={4}
            placeholder="2010"
            hint={`Año de 4 dígitos entre 1800 y ${CURRENT_YEAR}.`}
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="formGrid">
          <TextField
            label="RUC"
            name="ruc"
            value={state.ruc}
            onChange={(event) => update("ruc", event.target.value)}
            error={fieldErrors.ruc}
            inputMode="numeric"
            maxLength={11}
            placeholder="20123456789"
            hint="11 dígitos. Obligatorio."
            disabled={isSubmitting}
            required
          />

          <TextField
            label="Enlace del logo"
            name="logoUrl"
            type="url"
            value={state.logoUrl}
            onChange={(event) => update("logoUrl", event.target.value)}
            error={fieldErrors.logoUrl}
            placeholder="https://ejemplo.com/logo.png"
            hint="Enlace web obligatorio. No se suben archivos."
            disabled={isSubmitting}
            required
          />
        </div>

        <TextAreaField
          label="Descripción"
          name="description"
          value={state.description}
          onChange={(event) => update("description", event.target.value)}
          error={fieldErrors.description}
          maxLength={LIMITS.description}
          rows={4}
          hint={`Obligatoria. Máximo ${LIMITS.description} caracteres.`}
          disabled={isSubmitting}
          required
        />
      </section>

      <section className="formSection" aria-labelledby="organization-location">
        <h2 className="formSectionTitle" id="organization-location">
          {showSectionNumbers ? (
            <span className="formSectionIndex" aria-hidden="true">
              2
            </span>
          ) : null}
          Ubicación
        </h2>

        <UbigeoFields
          ubigeoCode={state.ubigeoCode}
          disabled={isSubmitting}
          error={fieldErrors.ubigeoCode}
          onChange={(code) => update("ubigeoCode", code)}
        />

        <TextField
          label="Dirección"
          name="address"
          value={state.address}
          onChange={(event) => update("address", event.target.value)}
          error={fieldErrors.address}
          maxLength={LIMITS.address}
          autoComplete="street-address"
          disabled={isSubmitting}
          required
        />
      </section>

      <section className="formSection" aria-labelledby="organization-contact">
        <h2 className="formSectionTitle" id="organization-contact">
          {showSectionNumbers ? (
            <span className="formSectionIndex" aria-hidden="true">
              3
            </span>
          ) : null}
          Contacto institucional
        </h2>
        <p className="formSectionNote">
          Usa únicamente contactos institucionales. No se registran datos
          personales de representantes.
        </p>

        <div className="formGrid">
          <TextField
            label="Correo institucional"
            name="institutionalEmail"
            type="email"
            value={state.institutionalEmail}
            onChange={(event) =>
              update("institutionalEmail", event.target.value)
            }
            error={fieldErrors.institutionalEmail}
            maxLength={LIMITS.email}
            placeholder="contacto@organizacion.pe"
            disabled={isSubmitting}
            required
          />

          <TextField
            label="Teléfono institucional"
            name="institutionalPhone"
            type="tel"
            value={state.institutionalPhone}
            onChange={(event) =>
              update("institutionalPhone", event.target.value)
            }
            error={fieldErrors.institutionalPhone}
            maxLength={LIMITS.phone}
            placeholder="(01) 555 5555"
            disabled={isSubmitting}
            required
          />
        </div>

        <TextField
          label="Sitio web"
          name="websiteUrl"
          type="url"
          value={state.websiteUrl}
          onChange={(event) => update("websiteUrl", event.target.value)}
          error={fieldErrors.websiteUrl}
          placeholder="https://organizacion.pe"
          disabled={isSubmitting}
        />

        <div className="formGrid">
          <TextField
            label="Instagram"
            name="instagramUrl"
            type="url"
            value={state.instagramUrl}
            onChange={(event) => update("instagramUrl", event.target.value)}
            error={fieldErrors.instagramUrl}
            placeholder="https://instagram.com/organizacion"
            disabled={isSubmitting}
          />

          <TextField
            label="Facebook"
            name="facebookUrl"
            type="url"
            value={state.facebookUrl}
            onChange={(event) => update("facebookUrl", event.target.value)}
            error={fieldErrors.facebookUrl}
            placeholder="https://facebook.com/organizacion"
            disabled={isSubmitting}
          />
        </div>

        <div className="formGrid">
          <TextField
            label="YouTube"
            name="youtubeUrl"
            type="url"
            value={state.youtubeUrl}
            onChange={(event) => update("youtubeUrl", event.target.value)}
            error={fieldErrors.youtubeUrl}
            placeholder="https://youtube.com/@organizacion"
            disabled={isSubmitting}
          />

          <TextField
            label="TikTok"
            name="tiktokUrl"
            type="url"
            value={state.tiktokUrl}
            onChange={(event) => update("tiktokUrl", event.target.value)}
            error={fieldErrors.tiktokUrl}
            placeholder="https://tiktok.com/@organizacion"
            disabled={isSubmitting}
          />
        </div>
      </section>

      {kind === "academy" ? (
        <section className="formSection" aria-labelledby="organization-academy">
          <h2 className="formSectionTitle" id="organization-academy">
            {showSectionNumbers ? (
              <span className="formSectionIndex" aria-hidden="true">
                4
              </span>
            ) : null}
            Información de la academia
          </h2>

          <div className="formGrid">
            <TextField
              label="Sede"
              name="headquarters"
              value={state.headquarters}
              onChange={(event) =>
                update("headquarters", event.target.value)
              }
              error={fieldErrors.headquarters}
              maxLength={LIMITS.headquarters}
              disabled={isSubmitting}
              required
            />

            {mode === "edit" ? (
              <TextField
                label="Representante"
                name="representativeName"
                value={state.representativeName}
                error={fieldErrors.representativeName}
                maxLength={LIMITS.representative}
                hint="Se obtiene de la cuenta de Director de academia asignada; se actualiza al crear o asignar esa cuenta."
                readOnly
                disabled
              />
            ) : null}
          </div>
        </section>
      ) : null}

      {kind === "club" && mode === "create" ? (
        <section className="formSection" aria-labelledby="organization-status">
          <h2 className="formSectionTitle" id="organization-status">
            {showSectionNumbers ? (
              <span className="formSectionIndex" aria-hidden="true">
                4
              </span>
            ) : null}
            Estado
          </h2>

          <div className="formGrid">
            <TextField
              label="Estado operativo"
              name="operationalStatus"
              value="Activo"
              readOnly
              disabled
              hint="La organización se crea activa y pendiente de verificación."
            />
          </div>

          <p className="formSectionNote">
            El estado inicial se asigna automáticamente. Solo el Administrador
            puede cambiar la verificación y la vigencia de la organización.
          </p>
        </section>
      ) : null}

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
        {title}: el país es Perú y la ubicación se selecciona por departamento,
        provincia y distrito. Los cambios sensibles pueden reiniciar la
        verificación a cargo del Administrador.
      </p>
    </form>
  );
}
