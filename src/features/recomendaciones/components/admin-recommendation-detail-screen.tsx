"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { InlineLoading, StatePanel } from "@/components/ui/loading";
import { useAuth } from "@/features/auth/auth-provider";
import { ApiError, isAbortError } from "@/lib/api-client";
import { formatProspectDateTime } from "@/features/prospecciones/catalogs";
import type { RecommendationAdminResponse } from "@/types/api";
import { canAuditRecommendations } from "../access";
import {
  recommendationStatusBadgeClass,
  recommendationStatusLabel,
  responseStatusBadgeClass,
  responseStatusLabel,
} from "../catalogs";
import { getAdminRecommendation } from "../recommendations-api";
import { ADMIN_RECOMMENDATIONS_PATH } from "../routes";
import { RecommendationAccessRestricted } from "./recommendation-access-restricted";

export function AdminRecommendationDetailScreen() {
  const { user, markSessionExpired } = useAuth();
  const allowed = canAuditRecommendations(user?.role);
  const params = useParams();
  const rawId = params.id;
  const idValue = Array.isArray(rawId) ? rawId[0] : rawId;
  const id = Number(idValue);
  const hasValidId = Number.isInteger(id) && id > 0;

  const [recommendation, setRecommendation] =
    useState<RecommendationAdminResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [loadedRequestKey, setLoadedRequestKey] = useState<string | null>(null);

  const requestKey = `${id}:${reloadKey}`;
  const isLoading = loadedRequestKey !== requestKey;

  useEffect(() => {
    if (!allowed || !hasValidId) {
      return;
    }

    const controller = new AbortController();
    let isActive = true;

    getAdminRecommendation(id, controller.signal)
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
            ? "La recomendación no existe."
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
        title="Auditoría de recomendaciones"
        message="Solo un administrador puede consultar los datos generales de auditoría."
      />
    );
  }

  if (!hasValidId) {
    return (
      <div>
        <header className="pageHeader">
          <div>
            <p className="eyebrow">ADMINISTRACIÓN</p>
            <h1>Recomendación no válida</h1>
            <p>La dirección de esta página no es válida.</p>
          </div>
        </header>
        <StatePanel
          title="No se pudo abrir la recomendación"
          action={
            <Link className="button buttonSecondary" href={ADMIN_RECOMMENDATIONS_PATH}>
              Volver a recomendaciones
            </Link>
          }
        >
          <p>Verifica el enlace o regresa al listado de auditoría.</p>
        </StatePanel>
      </div>
    );
  }

  return (
    <div>
      <header className="pageHeader">
        <div>
          <p className="eyebrow">ADMINISTRACIÓN</p>
          <h1>Datos generales de la recomendación</h1>
          <p>
            Vista de auditoría sin carta, información compartida ni notas
            privadas.
          </p>
        </div>
        <Link className="button buttonSecondary" href={ADMIN_RECOMMENDATIONS_PATH}>
          Volver a recomendaciones
        </Link>
      </header>

      {isLoading ? (
        <InlineLoading message="Cargando datos generales…" />
      ) : loadError || !recommendation ? (
        <Alert variant="error" title="No se pudieron cargar los datos generales">
          <p>{loadError ?? "La recomendación no está disponible."}</p>
          <button
            className="linkButton"
            type="button"
            onClick={() => setReloadKey((current) => current + 1)}
          >
            Reintentar
          </button>
        </Alert>
      ) : (
        <section className="card" aria-labelledby="admin-recommendation-metadata">
          <div className="tableHeader">
            <h2 className="cardTitle" id="admin-recommendation-metadata">
              Recomendación #{recommendation.id}
            </h2>
            <div className="badgeRow">
              <span
                className={recommendationStatusBadgeClass(
                  recommendation.status,
                )}
              >
                {recommendationStatusLabel(recommendation.status)}
              </span>
              <span
                className={responseStatusBadgeClass(
                  recommendation.lastResponseStatus,
                )}
              >
                {responseStatusLabel(recommendation.lastResponseStatus)}
              </span>
            </div>
          </div>

          <dl className="metaList">
            <div>
              <dt>Jugador</dt>
              <dd>
                {recommendation.playerFirstName} {recommendation.playerLastName}{" "}
                (#{recommendation.playerId})
              </dd>
            </div>
            <div>
              <dt>Ojeador</dt>
              <dd>
                {recommendation.scoutFirstName} {recommendation.scoutLastName}{" "}
                (#{recommendation.scoutId})
              </dd>
            </div>
            <div>
              <dt>Club</dt>
              <dd>
                {recommendation.clubName} ({recommendation.clubCode})
              </dd>
            </div>
            <div>
              <dt>Prospección</dt>
              <dd>#{recommendation.prospectId}</dd>
            </div>
            <div>
              <dt>Enviada</dt>
              <dd>{formatProspectDateTime(recommendation.sentAt)}</dd>
            </div>
            <div>
              <dt>Creada</dt>
              <dd>{formatProspectDateTime(recommendation.createdAt)}</dd>
            </div>
            <div>
              <dt>Última respuesta</dt>
              <dd>
                {responseStatusLabel(recommendation.lastResponseStatus)} ·{" "}
                {recommendation.lastResponseAt
                  ? formatProspectDateTime(recommendation.lastResponseAt)
                  : "—"}
              </dd>
            </div>
          </dl>
        </section>
      )}

      <p className="footnote">
        La auditoría solo muestra datos generales; no incluye la carta ni la
        información compartida. No se muestran notas privadas ni evaluaciones.
      </p>
    </div>
  );
}
