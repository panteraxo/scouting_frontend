"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { SelectField, TextAreaField } from "@/components/ui/form-field";
import { InlineLoading, Spinner, StatePanel } from "@/components/ui/loading";
import { useAuth } from "@/features/auth/auth-provider";
import { ApiError, isAbortError } from "@/lib/api-client";
import type {
  RecommendationDetail,
  RecommendationResponseStatus,
} from "@/types/api";
import { canManageClubRecommendations } from "../access";
import { RESPONSE_STATUS_OPTIONS } from "../catalogs";
import {
  getClubRecommendation,
  respondToClubRecommendation,
} from "../recommendations-api";
import { CLUB_RECOMMENDATIONS_PATH } from "../routes";
import { RecommendationAccessRestricted } from "./recommendation-access-restricted";
import { RecommendationDetailView } from "./recommendation-detail-view";

export function ClubRecommendationDetailScreen() {
  const { user, markSessionExpired } = useAuth();
  const allowed = canManageClubRecommendations(user?.role);
  const params = useParams();
  const rawId = params.id;
  const idValue = Array.isArray(rawId) ? rawId[0] : rawId;
  const id = Number(idValue);
  const hasValidId = Number.isInteger(id) && id > 0;

  const [recommendation, setRecommendation] =
    useState<RecommendationDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [loadedRequestKey, setLoadedRequestKey] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [status, setStatus] = useState<
    "" | RecommendationResponseStatus
  >("");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requestKey = `${id}:${reloadKey}`;
  const isLoading = loadedRequestKey !== requestKey;

  useEffect(() => {
    if (!allowed || !hasValidId) {
      return;
    }

    const controller = new AbortController();
    let isActive = true;

    getClubRecommendation(id, controller.signal)
      .then((data) => {
        if (!isActive) {
          return;
        }

        setRecommendation(data);
        setLoadError(null);
        setLoadedRequestKey(requestKey);
      })
      .catch((error: unknown) => {
        if (!isActive || isAbortError(error)) {
          return;
        }

        if (error instanceof ApiError && error.status === 401) {
          markSessionExpired();
          return;
        }

        setRecommendation(null);
        setLoadError(
          error instanceof ApiError && error.status === 404
            ? "La recomendación no existe o no está dirigida a tu club."
            : error instanceof Error
              ? error.message
              : "No se pudo cargar la recomendación.",
        );
        setLoadedRequestKey(requestKey);
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [allowed, hasValidId, id, reloadKey, requestKey, markSessionExpired]);

  if (!allowed) {
    return (
      <RecommendationAccessRestricted
        title="Recomendación del club"
        message="Solo el Responsable del club destinatario puede consultar y responder esta recomendación."
      />
    );
  }

  if (!hasValidId) {
    return (
      <div>
        <header className="pageHeader">
          <div>
            <p className="eyebrow">MI CLUB</p>
            <h1>Recomendación no válida</h1>
            <p>La dirección de esta página no es válida.</p>
          </div>
        </header>
        <StatePanel
          title="No se pudo abrir la recomendación"
          action={
            <Link className="button buttonSecondary" href={CLUB_RECOMMENDATIONS_PATH}>
              Volver a recomendaciones
            </Link>
          }
        >
          <p>Verifica el enlace o regresa a la bandeja del club.</p>
        </StatePanel>
      </div>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    const errors: Record<string, string> = {};
    if (!status) {
      errors.status = "Selecciona el estado de la respuesta.";
    }
    if (!message.trim()) {
      errors.message = "Ingresa el mensaje de la respuesta.";
    } else if (message.trim().length > 4000) {
      errors.message = "El mensaje no debe superar 4000 caracteres.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormError("Revisa los campos marcados e intenta nuevamente.");
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const updated = await respondToClubRecommendation(id, {
        status: status as RecommendationResponseStatus,
        message: message.trim(),
      });

      if (updated) {
        setRecommendation(updated);
        setMessage("");
        setStatus("");
        setSuccessMessage(
          "La respuesta se registró. Las respuestas no se editan ni eliminan.",
        );
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        markSessionExpired();
        return;
      }

      if (error instanceof ApiError && error.fieldErrors) {
        setFieldErrors(error.fieldErrors);
        setFormError("Revisa los campos marcados e intenta nuevamente.");
      } else if (error instanceof ApiError && error.code === "CLUB_INACTIVE") {
        setFormError(
          "El club está inhabilitado y no puede responder hasta que sea reactivado.",
        );
      } else {
        setFormError(
          error instanceof Error
            ? error.message
            : "No se pudo registrar la respuesta.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      {successMessage ? (
        <Alert variant="success" title="Respuesta registrada">
          <p>{successMessage}</p>
        </Alert>
      ) : null}

      {isLoading ? (
        <InlineLoading message="Cargando recomendación…" />
      ) : loadError || !recommendation ? (
        <>
          <header className="pageHeader">
            <div>
              <p className="eyebrow">MI CLUB</p>
              <h1>Recomendación</h1>
              <p>Bandeja privada del club asignado.</p>
            </div>
            <Link className="button buttonSecondary" href={CLUB_RECOMMENDATIONS_PATH}>
              Volver a recomendaciones
            </Link>
          </header>
          <Alert variant="error" title="No se pudo cargar la recomendación">
            <p>{loadError ?? "La recomendación no está disponible."}</p>
            <button
              className="linkButton"
              type="button"
              onClick={() => setReloadKey((current) => current + 1)}
            >
              Reintentar
            </button>
          </Alert>
        </>
      ) : (
        <RecommendationDetailView
          recommendation={recommendation}
          backHref={CLUB_RECOMMENDATIONS_PATH}
          backLabel="Volver a recomendaciones"
        >
          {recommendation.club.operationalStatus === "INACTIVE" ? (
            <section className="card sectionSpacer" aria-labelledby="club-response-form">
              <h2 className="cardTitle" id="club-response-form">
                Registrar respuesta
              </h2>
              <Alert variant="warning" title="Club inhabilitado">
                <p>
                  El club está inhabilitado. La recomendación se conserva en
                  solo lectura y no se pueden registrar nuevas respuestas hasta
                  que un administrador reactive el club.
                </p>
              </Alert>
            </section>
          ) : (
            <section className="card sectionSpacer" aria-labelledby="club-response-form">
              <h2 className="cardTitle" id="club-response-form">
                Registrar respuesta
              </h2>
              <p className="formSectionNote">
                Cada respuesta se agrega al historial del club. No se edita ni
                elimina; no hay conversación adicional.
              </p>
              <form className="form" onSubmit={handleSubmit} noValidate>
                {formError ? (
                  <Alert variant="error" title="No se pudo registrar">
                    <p>{formError}</p>
                  </Alert>
                ) : null}
                <SelectField
                  label="Estado de la respuesta"
                  name="status"
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as RecommendationResponseStatus)
                  }
                  error={fieldErrors.status}
                  disabled={isSubmitting}
                  required
                >
                  <option value="">Selecciona un estado</option>
                  {RESPONSE_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </SelectField>
                <TextAreaField
                  label="Mensaje"
                  name="message"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  error={fieldErrors.message}
                  maxLength={4000}
                  rows={5}
                  hint="Obligatorio. Máximo 4000 caracteres."
                  disabled={isSubmitting}
                  required
                />
                <div className="formActions">
                  <button
                    className="button buttonPrimary"
                    type="submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <Spinner /> : null}
                    {isSubmitting ? "Enviando…" : "Enviar respuesta"}
                  </button>
                </div>
              </form>
            </section>
          )}
        </RecommendationDetailView>
      )}
    </div>
  );
}
