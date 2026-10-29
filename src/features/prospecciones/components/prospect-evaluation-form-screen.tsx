"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import {
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/ui/form-field";
import { InlineLoading, Spinner, StatePanel } from "@/components/ui/loading";
import { useAuth } from "@/features/auth/auth-provider";
import { ApiError, isAbortError } from "@/lib/api-client";
import type {
  ProspectEvaluation,
  ProspectEvaluationInput,
  ProspectResponse,
} from "@/types/api";
import { canUseProspects } from "../access";
import {
  formatProspectDate,
  prospectPlayerName,
  todayInLima,
} from "../catalogs";
import {
  createProspectEvaluation,
  getProspect,
} from "../prospects-api";
import { prospectDetailPath, PROSPECTS_PATH } from "../routes";
import { ProspectAccessRestricted } from "./prospect-access-restricted";

const RATING_OPTIONS = [1, 2, 3, 4, 5];

interface EvaluationFormState {
  evaluatedAt: string;
  technicalRating: string;
  tacticalRating: string;
  physicalRating: string;
  mentalRating: string;
  overallRating: string;
  strengths: string;
  improvements: string;
  recommendation: string;
  privateNotes: string;
  videoUrl: string;
}

const EMPTY_FORM: EvaluationFormState = {
  evaluatedAt: "",
  technicalRating: "",
  tacticalRating: "",
  physicalRating: "",
  mentalRating: "",
  overallRating: "",
  strengths: "",
  improvements: "",
  recommendation: "",
  privateNotes: "",
  videoUrl: "",
};

type FieldErrors = Record<string, string>;

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function nullableString(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function ProspectEvaluationFormScreen() {
  const { user, markSessionExpired } = useAuth();
  const allowed = canUseProspects(user?.role);
  const params = useParams();
  const rawId = params.id;
  const idValue = Array.isArray(rawId) ? rawId[0] : rawId;
  const prospectId = Number(idValue);
  const hasValidId = Number.isInteger(prospectId) && prospectId > 0;

  const [prospect, setProspect] = useState<ProspectResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState<EvaluationFormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [created, setCreated] = useState<ProspectEvaluation | null>(null);

  useEffect(() => {
    if (!allowed || !hasValidId) {
      return;
    }

    const controller = new AbortController();
    let isActive = true;

    getProspect(prospectId, controller.signal)
      .then((data) => {
        if (!isActive) {
          return;
        }

        setProspect(data);
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (!isActive || isAbortError(error)) {
          return;
        }

        if (error instanceof ApiError && error.status === 401) {
          markSessionExpired();
          return;
        }

        setProspect(null);
        setLoadError(
          error instanceof ApiError && error.status === 404
            ? "La prospección no existe o pertenece a otro ojeador."
            : error instanceof Error
              ? error.message
              : "No se pudo cargar la prospección.",
        );
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [allowed, hasValidId, prospectId, markSessionExpired]);

  if (!allowed) {
    return (
      <ProspectAccessRestricted
        title="Nueva evaluación"
        message="Solo el ojeador autor puede crear evaluaciones de su prospección."
      />
    );
  }

  if (!hasValidId) {
    return (
      <div>
        <header className="pageHeader">
          <div>
            <p className="eyebrow">MI PROSPECCIÓN</p>
            <h1>Prospección no válida</h1>
            <p>La dirección de esta página no es válida.</p>
          </div>
        </header>
        <StatePanel
          title="No se pudo abrir el formulario"
          action={
            <Link className="button buttonSecondary" href={PROSPECTS_PATH}>
              Volver a prospecciones
            </Link>
          }
        >
          <p>Verifica el enlace o regresa al listado de prospecciones.</p>
        </StatePanel>
      </div>
    );
  }

  function update<K extends keyof EvaluationFormState>(
    key: K,
    value: EvaluationFormState[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function validate(): FieldErrors {
    const errors: FieldErrors = {};

    if (!form.evaluatedAt) {
      errors.evaluatedAt = "Ingresa la fecha de evaluación.";
    } else {
      const today = todayInLima();
      if (form.evaluatedAt > today) {
        errors.evaluatedAt = "La fecha de evaluación no puede ser futura.";
      }
    }

    const requiredRatings: Array<[keyof EvaluationFormState, string]> = [
      ["technicalRating", "El rating técnico es obligatorio."],
      ["tacticalRating", "El rating táctico es obligatorio."],
      ["physicalRating", "El rating físico es obligatorio."],
      ["mentalRating", "El rating mental es obligatorio."],
    ];

    for (const [key, message] of requiredRatings) {
      if (!form[key]) {
        errors[key] = message;
      }
    }

    const optionalRatings: Array<[keyof EvaluationFormState, string]> = [
      ["overallRating", "General"],
      ["technicalRating", "Técnico"],
      ["tacticalRating", "Táctico"],
      ["physicalRating", "Físico"],
      ["mentalRating", "Mental"],
    ];

    for (const [key, label] of optionalRatings) {
      const raw = String(form[key] ?? "");
      if (!raw) {
        continue;
      }
      const value = Number(raw);
      if (!Number.isInteger(value) || value < 1 || value > 5) {
        errors[key] = `${label} debe estar entre 1 y 5.`;
      }
    }

    if (form.strengths.trim().length > 2000) {
      errors.strengths = "Las fortalezas no deben superar 2000 caracteres.";
    }
    if (form.improvements.trim().length > 2000) {
      errors.improvements = "Las mejoras no deben superar 2000 caracteres.";
    }
    if (form.recommendation.trim().length > 2000) {
      errors.recommendation =
        "La recomendación no debe superar 2000 caracteres.";
    }
    if (form.privateNotes.trim().length > 2000) {
      errors.privateNotes = "Las notas privadas no deben superar 2000 caracteres.";
    }
    if (form.videoUrl.trim()) {
      if (!isHttpUrl(form.videoUrl.trim())) {
        errors.videoUrl = "Ingresa un enlace web válido.";
      } else if (form.videoUrl.trim().length > 500) {
        errors.videoUrl = "El enlace no debe superar 500 caracteres.";
      }
    }

    return errors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormError("Revisa los campos marcados e intenta nuevamente.");
      document.getElementById(Object.keys(errors)[0])?.focus();
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setIsSubmitting(true);

    const payload: ProspectEvaluationInput = {
      evaluatedAt: form.evaluatedAt,
      technicalRating: Number(form.technicalRating),
      tacticalRating: Number(form.tacticalRating),
      physicalRating: Number(form.physicalRating),
      mentalRating: Number(form.mentalRating),
      overallRating: form.overallRating ? Number(form.overallRating) : null,
      strengths: nullableString(form.strengths),
      improvements: nullableString(form.improvements),
      recommendation: nullableString(form.recommendation),
      privateNotes: nullableString(form.privateNotes),
      videoUrl: nullableString(form.videoUrl),
    };

    try {
      const result = await createProspectEvaluation(prospectId, payload);
      if (result) {
        setCreated(result);
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        markSessionExpired();
        return;
      }

      if (error instanceof ApiError && error.fieldErrors) {
        setFieldErrors(error.fieldErrors);
        setFormError("Revisa los campos marcados e intenta nuevamente.");
      } else {
        setFormError(
          error instanceof Error
            ? error.message
            : "No se pudo registrar la evaluación.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <header className="pageHeader">
        <div>
          <p className="eyebrow">MI PROSPECCIÓN</p>
          <h1>Nueva evaluación</h1>
          <p>
            {prospect
              ? `${prospectPlayerName(prospect.player)} · La evaluación se agrega al historial y no puede editarse ni eliminarse.`
              : "Registra una evaluación privada del jugador."}
          </p>
        </div>
        <Link
          className="button buttonSecondary"
          href={prospectDetailPath(prospectId)}
        >
          Volver a la prospección
        </Link>
      </header>

      {created ? (
        <>
          <Alert variant="success" title="Evaluación registrada">
            <p>
              La evaluación del {formatProspectDate(created.evaluatedAt)} quedó
              agregada al historial. No puede editarse ni eliminarse.
            </p>
          </Alert>
          <div className="formActions">
            <Link
              className="button buttonPrimary"
              href={prospectDetailPath(prospectId)}
            >
              Volver a la prospección
            </Link>
            <button
              className="button buttonSecondary"
              type="button"
              onClick={() => {
                setCreated(null);
                setForm(EMPTY_FORM);
                setFieldErrors({});
                setFormError(null);
              }}
            >
              Registrar otra evaluación
            </button>
          </div>
        </>
      ) : isLoading ? (
        <InlineLoading message="Cargando prospección…" />
      ) : loadError || !prospect ? (
        <Alert variant="error" title="No se pudo abrir el formulario">
          <p>{loadError ?? "La prospección no está disponible."}</p>
          <Link
            className="button buttonSecondary buttonSmall cardAction"
            href={prospectDetailPath(prospectId)}
          >
            Volver a la prospección
          </Link>
        </Alert>
      ) : prospect.status === "CLOSED" ? (
        <StatePanel
          title="Prospección cerrada"
          action={
            <Link
              className="button buttonSecondary"
              href={prospectDetailPath(prospectId)}
            >
              Volver a la prospección
            </Link>
          }
        >
          <p>
            No se pueden agregar evaluaciones a una prospección cerrada. Reabre
            la prospección desde su detalle.
          </p>
        </StatePanel>
      ) : (
        <section className="card">
          <form className="form" onSubmit={handleSubmit} noValidate>
            {formError ? (
              <Alert variant="error" title="No se pudo registrar">
                <p>{formError}</p>
              </Alert>
            ) : null}

            <TextField
              label="Fecha de evaluación"
              name="evaluatedAt"
              type="date"
              value={form.evaluatedAt}
              onChange={(event) => update("evaluatedAt", event.target.value)}
              error={fieldErrors.evaluatedAt}
              disabled={isSubmitting}
              required
            />

            <div className="formGrid">
              <RatingSelect
                label="Rating técnico"
                name="technicalRating"
                value={form.technicalRating}
                error={fieldErrors.technicalRating}
                onChange={(value) => update("technicalRating", value)}
                disabled={isSubmitting}
                required
              />
              <RatingSelect
                label="Rating táctico"
                name="tacticalRating"
                value={form.tacticalRating}
                error={fieldErrors.tacticalRating}
                onChange={(value) => update("tacticalRating", value)}
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="formGrid">
              <RatingSelect
                label="Rating físico"
                name="physicalRating"
                value={form.physicalRating}
                error={fieldErrors.physicalRating}
                onChange={(value) => update("physicalRating", value)}
                disabled={isSubmitting}
                required
              />
              <RatingSelect
                label="Rating mental"
                name="mentalRating"
                value={form.mentalRating}
                error={fieldErrors.mentalRating}
                onChange={(value) => update("mentalRating", value)}
                disabled={isSubmitting}
                required
              />
            </div>

            <RatingSelect
              label="Rating general (opcional)"
              name="overallRating"
              value={form.overallRating}
              error={fieldErrors.overallRating}
              onChange={(value) => update("overallRating", value)}
              disabled={isSubmitting}
            />

            <TextAreaField
              label="Fortalezas"
              name="strengths"
              value={form.strengths}
              onChange={(event) => update("strengths", event.target.value)}
              error={fieldErrors.strengths}
              maxLength={2000}
              rows={3}
              disabled={isSubmitting}
            />
            <TextAreaField
              label="Mejoras"
              name="improvements"
              value={form.improvements}
              onChange={(event) => update("improvements", event.target.value)}
              error={fieldErrors.improvements}
              maxLength={2000}
              rows={3}
              disabled={isSubmitting}
            />
            <TextAreaField
              label="Recomendación"
              name="recommendation"
              value={form.recommendation}
              onChange={(event) => update("recommendation", event.target.value)}
              error={fieldErrors.recommendation}
              maxLength={2000}
              rows={3}
              disabled={isSubmitting}
            />
            <TextAreaField
              label="Notas privadas"
              name="privateNotes"
              value={form.privateNotes}
              onChange={(event) => update("privateNotes", event.target.value)}
              error={fieldErrors.privateNotes}
              maxLength={2000}
              rows={3}
              hint="Solo tú puedes ver estas notas. No se comparten con Admin, academia, club ni jugador."
              disabled={isSubmitting}
            />
            <TextField
              label="Enlace de video (opcional)"
              name="videoUrl"
              type="url"
              value={form.videoUrl}
              onChange={(event) => update("videoUrl", event.target.value)}
              error={fieldErrors.videoUrl}
              placeholder="https://..."
              hint="Solo enlaces web; no se cargan archivos."
              disabled={isSubmitting}
            />

            <div className="formActions">
              <button
                className="button buttonPrimary"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? <Spinner /> : null}
                {isSubmitting ? "Registrando…" : "Registrar evaluación"}
              </button>
              <Link
                className="button buttonSecondary"
                href={prospectDetailPath(prospectId)}
              >
                Cancelar
              </Link>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}

function RatingSelect({
  label,
  name,
  value,
  error,
  onChange,
  disabled,
  required,
}: {
  label: string;
  name: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  disabled: boolean;
  required?: boolean;
}) {
  return (
    <SelectField
      label={label}
      name={name}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      error={error}
      disabled={disabled}
      required={required}
    >
      <option value="">Selecciona un rating</option>
      {RATING_OPTIONS.map((rating) => (
        <option key={rating} value={rating}>
          {rating}
        </option>
      ))}
    </SelectField>
  );
}
