"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { InlineLoading, StatePanel } from "@/components/ui/loading";
import { useAuth } from "@/features/auth/auth-provider";
import { ApiError, isAbortError } from "@/lib/api-client";
import { formatProspectDateTime } from "@/features/prospecciones/catalogs";
import { positionLabel } from "@/features/jugadores/catalogs";
import type {
  PageResponse,
  RecommendationSummary,
} from "@/types/api";
import { canManageClubRecommendations } from "../access";
import {
  recommendationPlayerName,
  recommendationScoutName,
  recommendationStatusBadgeClass,
  recommendationStatusLabel,
  responseStatusBadgeClass,
  responseStatusLabel,
} from "../catalogs";
import { listClubRecommendations } from "../recommendations-api";
import { clubRecommendationDetailPath } from "../routes";
import { RecommendationAccessRestricted } from "./recommendation-access-restricted";

const PAGE_SIZE = 20;

export function ClubRecommendationListScreen() {
  const { user, markSessionExpired } = useAuth();
  const allowed = canManageClubRecommendations(user?.role);
  const [page, setPage] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] =
    useState<PageResponse<RecommendationSummary> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadedRequestKey, setLoadedRequestKey] = useState<string | null>(null);

  const requestKey = `${page}:${reloadKey}`;
  const isLoading = loadedRequestKey !== requestKey;

  useEffect(() => {
    if (!allowed) {
      return;
    }

    const controller = new AbortController();
    let isActive = true;

    listClubRecommendations(
      { page, size: PAGE_SIZE },
      controller.signal,
    )
      .then((data) => {
        if (!isActive) {
          return;
        }

        setResult(data);
        setLoadError(null);
        setLoadedRequestKey(requestKey);

        if (data.content.length === 0 && data.page > 0) {
          setPage(Math.max(0, data.page - 1));
        }
      })
      .catch((error: unknown) => {
        if (!isActive || isAbortError(error)) {
          return;
        }

        if (error instanceof ApiError && error.status === 401) {
          markSessionExpired();
          return;
        }

        setResult(null);
        setLoadError(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar las recomendaciones del club.",
        );
        setLoadedRequestKey(requestKey);
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [allowed, page, reloadKey, requestKey, markSessionExpired]);

  if (!allowed) {
    return (
      <RecommendationAccessRestricted
        title="Recomendaciones del club"
        message="Esta bandeja está disponible solo para el Responsable de club asignado."
      />
    );
  }

  const totalPages = result?.totalPages ?? 0;
  const totalElements = result?.totalElements ?? 0;
  const currentPage = result?.page ?? page;
  const hasPrevious = page > 0;
  const hasNext = totalPages > 0 && page + 1 < totalPages;

  return (
    <div>
      <header className="pageHeader">
        <div>
          <p className="eyebrow">MI CLUB</p>
          <h1>Recomendaciones</h1>
          <p>
            Bandeja de recomendaciones dirigidas al club asignado a tu cuenta.
            Solo puedes responder por ese club; las respuestas no se editan ni
            eliminan.
          </p>
        </div>
        <Link className="button buttonSecondary" href="/mi-club">
          Volver a Mi club
        </Link>
      </header>

      <section className="card tableCard" aria-labelledby="club-recommendation-results">
        <div className="tableHeader">
          <h2 className="cardTitle" id="club-recommendation-results">
            Bandeja
          </h2>
          {result ? (
            <p className="tableCount">
              {totalElements}{" "}
              {totalElements === 1 ? "recomendación" : "recomendaciones"}
            </p>
          ) : null}
        </div>

        {isLoading ? (
          <InlineLoading message="Cargando recomendaciones…" />
        ) : loadError ? (
          <Alert variant="error" title="No se pudieron cargar las recomendaciones">
            <p>{loadError}</p>
            <button
              className="linkButton"
              type="button"
              onClick={() => setReloadKey((current) => current + 1)}
            >
              Reintentar
            </button>
          </Alert>
        ) : !result || result.content.length === 0 ? (
          <StatePanel title="Sin recomendaciones">
            <p>
              No hay recomendaciones dirigidas al club asignado a tu cuenta.
            </p>
          </StatePanel>
        ) : (
          <>
            <div className="tableWrap">
              <table className="dataTable">
                <caption className="srOnly">
                  Recomendaciones dirigidas al club
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Jugador</th>
                    <th scope="col">Ojeador</th>
                    <th scope="col">Estado</th>
                    <th scope="col">Enviada</th>
                    <th scope="col">Última respuesta</th>
                    <th scope="col">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {result.content.map((recommendation) => (
                    <tr key={recommendation.id}>
                      <td>
                        <span className="cellStrong">
                          {recommendationPlayerName(recommendation.player)}
                        </span>
                        <span className="cellMuted">
                          {positionLabel(recommendation.player.position)}
                        </span>
                      </td>
                      <td>{recommendationScoutName(recommendation.scout)}</td>
                      <td>
                        <span
                          className={recommendationStatusBadgeClass(
                            recommendation.status,
                          )}
                        >
                          {recommendationStatusLabel(recommendation.status)}
                        </span>
                      </td>
                      <td>{formatProspectDateTime(recommendation.sentAt)}</td>
                      <td>
                        <span
                          className={responseStatusBadgeClass(
                            recommendation.lastResponseStatus,
                          )}
                        >
                          {responseStatusLabel(
                            recommendation.lastResponseStatus,
                          )}
                        </span>
                        <span className="cellMuted">
                          {recommendation.lastResponseAt
                            ? formatProspectDateTime(
                                recommendation.lastResponseAt,
                              )
                            : "Sin respuesta"}
                        </span>
                      </td>
                      <td>
                        <Link
                          className="button buttonSecondary buttonSmall"
                          href={clubRecommendationDetailPath(recommendation.id)}
                        >
                          Ver detalle
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <p className="paginationInfo">
                Página {currentPage + 1} de {Math.max(totalPages, 1)}
              </p>
              <div className="paginationActions">
                <button
                  className="button buttonSecondary buttonSmall"
                  type="button"
                  onClick={() => setPage((current) => Math.max(0, current - 1))}
                  disabled={!hasPrevious || isLoading}
                >
                  Anterior
                </button>
                <button
                  className="button buttonSecondary buttonSmall"
                  type="button"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={!hasNext || isLoading}
                >
                  Siguiente
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      <p className="footnote">
        El club se toma automáticamente de tu cuenta. Las respuestas no se
        editan ni eliminan.
      </p>
    </div>
  );
}
