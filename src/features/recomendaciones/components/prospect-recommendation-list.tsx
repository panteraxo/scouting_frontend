"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { InlineLoading, StatePanel } from "@/components/ui/loading";
import { useAuth } from "@/features/auth/auth-provider";
import { ApiError, isAbortError } from "@/lib/api-client";
import { formatProspectDateTime } from "@/features/prospecciones/catalogs";
import type {
  PageResponse,
  RecommendationSummary,
} from "@/types/api";
import { canManageRecommendations } from "../access";
import {
  recommendationStatusBadgeClass,
  recommendationStatusLabel,
  responseStatusBadgeClass,
  responseStatusLabel,
} from "../catalogs";
import { listProspectRecommendations } from "../recommendations-api";
import {
  prospectRecommendationCreatePath,
  scoutRecommendationDetailPath,
} from "../routes";

const PAGE_SIZE = 10;

export function ProspectRecommendationList({
  prospectId,
}: {
  prospectId: number;
}) {
  const { user, markSessionExpired } = useAuth();
  const allowed = canManageRecommendations(user?.role);
  const [page, setPage] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] =
    useState<PageResponse<RecommendationSummary> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadedRequestKey, setLoadedRequestKey] = useState<string | null>(null);

  const requestKey = `${prospectId}:${page}:${reloadKey}`;
  const isLoading = loadedRequestKey !== requestKey;

  useEffect(() => {
    if (!allowed) {
      return;
    }

    const controller = new AbortController();
    let isActive = true;

    listProspectRecommendations(
      prospectId,
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
            : "No se pudieron cargar las recomendaciones.",
        );
        setLoadedRequestKey(requestKey);
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [allowed, prospectId, page, reloadKey, requestKey, markSessionExpired]);

  if (!allowed) {
    return null;
  }

  const totalPages = result?.totalPages ?? 0;
  const totalElements = result?.totalElements ?? 0;
  const currentPage = result?.page ?? page;
  const hasPrevious = page > 0;
  const hasNext = totalPages > 0 && page + 1 < totalPages;

  return (
    <section className="card sectionSpacer" aria-labelledby="prospect-recommendations">
      <div className="tableHeader">
        <div>
          <h2 className="cardTitle" id="prospect-recommendations">
            Recomendaciones
          </h2>
          {result ? (
            <p className="tableCount">
              {totalElements}{" "}
              {totalElements === 1 ? "recomendación" : "recomendaciones"}
            </p>
          ) : null}
        </div>
        <Link
          className="button buttonPrimary buttonSmall"
          href={prospectRecommendationCreatePath(prospectId)}
        >
          Recomendar a club
        </Link>
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
        <StatePanel title="Sin recomendaciones enviadas">
          <p>
            Puedes recomendar a este jugador a un club activo y verificado. La
            carta y la selección de historiales/evaluaciones se guardan como
            información compartida al momento del envío.
          </p>
        </StatePanel>
      ) : (
        <>
          <div className="tableWrap">
            <table className="dataTable">
              <caption className="srOnly">
                Recomendaciones enviadas para esta prospección
              </caption>
              <thead>
                <tr>
                  <th scope="col">Club</th>
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
                        {recommendation.club.name}
                      </span>
                      <span className="cellMuted">
                        {recommendation.club.code}
                      </span>
                    </td>
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
                        {responseStatusLabel(recommendation.lastResponseStatus)}
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
                        href={scoutRecommendationDetailPath(recommendation.id)}
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
  );
}
