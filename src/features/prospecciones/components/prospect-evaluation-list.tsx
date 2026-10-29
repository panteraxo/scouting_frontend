"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { InlineLoading, StatePanel } from "@/components/ui/loading";
import { fullName } from "@/features/auth/user-labels";
import { useAuth } from "@/features/auth/auth-provider";
import { safeHttpUrl } from "@/features/organizations/labels";
import { ApiError, isAbortError } from "@/lib/api-client";
import type { PageResponse, ProspectEvaluation } from "@/types/api";
import {
  displayProspectText,
  formatProspectDate,
  formatProspectDateTime,
} from "../catalogs";
import { listProspectEvaluations } from "../prospects-api";
import { prospectEvaluationCreatePath } from "../routes";

const PAGE_SIZE = 10;

export function ProspectEvaluationList({
  prospectId,
  status,
}: {
  prospectId: number;
  status: "FOLLOWING" | "PAUSED" | "CLOSED";
}) {
  const { user, markSessionExpired } = useAuth();
  const [page, setPage] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] =
    useState<PageResponse<ProspectEvaluation> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadedRequestKey, setLoadedRequestKey] = useState<string | null>(null);

  const requestKey = `${prospectId}:${page}:${reloadKey}`;
  const isLoading = loadedRequestKey !== requestKey;

  useEffect(() => {
    const controller = new AbortController();
    let isActive = true;

    listProspectEvaluations(
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
            : "No se pudieron cargar las evaluaciones.",
        );
        setLoadedRequestKey(requestKey);
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [prospectId, page, reloadKey, requestKey, markSessionExpired]);

  const totalPages = result?.totalPages ?? 0;
  const totalElements = result?.totalElements ?? 0;
  const currentPage = result?.page ?? page;
  const hasPrevious = page > 0;
  const hasNext = totalPages > 0 && page + 1 < totalPages;

  return (
    <section className="card sectionSpacer" aria-labelledby="prospect-evaluations">
      <div className="tableHeader">
        <div>
          <h2 className="cardTitle" id="prospect-evaluations">
            Evaluaciones
          </h2>
          <p className="tableCount">
            Historial de solo lectura
            {result
              ? ` · ${totalElements} ${
                  totalElements === 1 ? "evaluación" : "evaluaciones"
                }`
              : ""}
          </p>
        </div>
        {status !== "CLOSED" ? (
          <Link
            className="button buttonPrimary buttonSmall"
            href={prospectEvaluationCreatePath(prospectId)}
          >
            Nueva evaluación
          </Link>
        ) : null}
      </div>

      {status === "CLOSED" ? (
        <Alert variant="info" title="Prospección cerrada">
          <p>
            Reabre la prospección para agregar nuevas evaluaciones. Las
            evaluaciones existentes se conservan y no se editan ni eliminan.
          </p>
        </Alert>
      ) : null}

      {isLoading ? (
        <InlineLoading message="Cargando evaluaciones…" />
      ) : loadError ? (
        <Alert variant="error" title="No se pudieron cargar las evaluaciones">
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
        <StatePanel title="Sin evaluaciones registradas">
          <p>
            Cada evaluación se agrega como un registro histórico nuevo. No se
            sobrescribe ni elimina una evaluación anterior.
          </p>
        </StatePanel>
      ) : (
        <>
          <div className="prospectEvaluationList">
            {result.content.map((evaluation) => {
              const videoUrl = safeHttpUrl(evaluation.videoUrl);
              return (
                <article className="prospectEvaluation" key={evaluation.id}>
                  <div className="prospectEvaluationHeader">
                    <div>
                      <p className="detailCode">
                        Evaluación del {formatProspectDate(evaluation.evaluatedAt)}
                      </p>
                      <p className="cellMuted">
                        Autor: {user ? fullName(user) : "Ojeador autenticado"} ·
                        Creada: {formatProspectDateTime(evaluation.createdAt)}
                      </p>
                    </div>
                    <span className="statusBadge statusNeutral">
                      Registrada
                    </span>
                  </div>

                  <div className="statGrid sectionSpacer">
                    <RatingItem label="Técnico" value={evaluation.technicalRating} />
                    <RatingItem label="Táctico" value={evaluation.tacticalRating} />
                    <RatingItem label="Físico" value={evaluation.physicalRating} />
                    <RatingItem label="Mental" value={evaluation.mentalRating} />
                    <RatingItem label="General" value={evaluation.overallRating} />
                  </div>

                  <div className="detailGrid sectionSpacer">
                    <div>
                      <h3 className="cardTitle">Fortalezas</h3>
                      <p className="preLine">
                        {displayProspectText(evaluation.strengths)}
                      </p>
                    </div>
                    <div>
                      <h3 className="cardTitle">Mejoras</h3>
                      <p className="preLine">
                        {displayProspectText(evaluation.improvements)}
                      </p>
                    </div>
                    <div>
                      <h3 className="cardTitle">Recomendación</h3>
                      <p className="preLine">
                        {displayProspectText(evaluation.recommendation)}
                      </p>
                    </div>
                    <div>
                      <h3 className="cardTitle">Notas privadas</h3>
                      <p className="preLine">
                        {displayProspectText(evaluation.privateNotes)}
                      </p>
                    </div>
                  </div>

                  {videoUrl ? (
                    <p className="sectionSpacer">
                      <a
                        className="button buttonSecondary buttonSmall"
                        href={videoUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        Ver video
                      </a>
                    </p>
                  ) : null}
                </article>
              );
            })}
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

      <p className="footnote">
        Las evaluaciones no se editan ni eliminan. Todas las evaluaciones
        pertenecen al ojeador autenticado.
      </p>
    </section>
  );
}

function RatingItem({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  return (
    <div className="statItem">
      <span className="statValue">
        {typeof value === "number" ? value : "—"}
      </span>
      <span className="statLabel">{label}</span>
    </div>
  );
}
