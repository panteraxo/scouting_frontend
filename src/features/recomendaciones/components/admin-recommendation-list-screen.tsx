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
  RecommendationAdminResponse,
} from "@/types/api";
import { canAuditRecommendations } from "../access";
import {
  recommendationStatusBadgeClass,
  recommendationStatusLabel,
  responseStatusBadgeClass,
  responseStatusLabel,
} from "../catalogs";
import { listAdminRecommendations } from "../recommendations-api";
import { adminRecommendationDetailPath } from "../routes";
import { RecommendationAccessRestricted } from "./recommendation-access-restricted";

const PAGE_SIZE = 20;

export function AdminRecommendationListScreen() {
  const { user, markSessionExpired } = useAuth();
  const allowed = canAuditRecommendations(user?.role);
  const [page, setPage] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] =
    useState<PageResponse<RecommendationAdminResponse> | null>(null);
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

    listAdminRecommendations({ page, size: PAGE_SIZE }, controller.signal)
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
  }, [allowed, page, reloadKey, requestKey, markSessionExpired]);

  if (!allowed) {
    return (
      <RecommendationAccessRestricted
        title="Auditoría de recomendaciones"
        message="Solo un administrador puede consultar los datos generales de auditoría."
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
          <p className="eyebrow">ADMINISTRACIÓN</p>
          <h1>Recomendaciones</h1>
          <p>
            Auditoría de datos generales: estado, jugador, ojeador, club y
            fechas. No se muestra la carta, la información compartida ni notas
            privadas.
          </p>
        </div>
        <Link className="button buttonSecondary" href="/inicio">
          Volver al inicio
        </Link>
      </header>

      <section className="card tableCard" aria-labelledby="admin-recommendation-results">
        <div className="tableHeader">
          <h2 className="cardTitle" id="admin-recommendation-results">
            Datos generales
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
            <p>No hay recomendaciones registradas en el sistema.</p>
          </StatePanel>
        ) : (
          <>
            <div className="tableWrap">
              <table className="dataTable">
                <caption className="srOnly">
                  Datos generales de recomendaciones para auditoría
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Jugador</th>
                    <th scope="col">Ojeador</th>
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
                          {recommendation.playerFirstName}{" "}
                          {recommendation.playerLastName}
                        </span>
                        <span className="cellMuted">
                          Jugador #{recommendation.playerId}
                        </span>
                      </td>
                      <td>
                        {recommendation.scoutFirstName}{" "}
                        {recommendation.scoutLastName}
                        <span className="cellMuted">
                          Ojeador #{recommendation.scoutId}
                        </span>
                      </td>
                      <td>
                        <span>{recommendation.clubName}</span>
                        <span className="cellMuted">
                          {recommendation.clubCode}
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
                          href={adminRecommendationDetailPath(recommendation.id)}
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
        La auditoría solo muestra datos generales; no incluye la carta, la
        información compartida ni las notas privadas.
      </p>
    </div>
  );
}
