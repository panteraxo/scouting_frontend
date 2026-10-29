"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { InlineLoading, StatePanel } from "@/components/ui/loading";
import { useAuth } from "@/features/auth/auth-provider";
import { safeHttpUrl } from "@/features/organizations/labels";
import { ApiError, isAbortError } from "@/lib/api-client";
import type {
  PageResponse,
  PlayerHistoryEntryResponse,
} from "@/types/api";
import { listPlayerHistory } from "../players-api";
import {
  activityTypeLabel,
  ageCategoryLabel,
  competitiveLevelLabel,
  formatDate,
  participationLabel,
  positionLabel,
  teamResultLabel,
} from "../catalogs";
import { playerHistoryCreatePath, playerHistoryEditPath } from "../routes";

const PAGE_SIZE = 10;

function scoreLabel(entry: PlayerHistoryEntryResponse): string {
  if (entry.teamGoals === null || entry.opponentGoals === null) {
    return "—";
  }

  return `${entry.teamGoals} - ${entry.opponentGoals}`;
}

function nullableNumber(value: number | null | undefined): string {
  return typeof value === "number" ? String(value) : "—";
}

const YOUTUBE_HOSTS = ["youtube.com", "youtube-nocookie.com", "youtu.be"];

function isYouTubeHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return YOUTUBE_HOSTS.some(
    (domain) => host === domain || host.endsWith(`.${domain}`),
  );
}

/** Convierte segundos a "m:ss" (o "h:mm:ss" si supera la hora). */
function formatVideoTimestamp(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;
  const padded = (value: number) => String(value).padStart(2, "0");

  return hours > 0
    ? `${hours}:${padded(minutes)}:${padded(rest)}`
    : `${minutes}:${padded(rest)}`;
}

interface VideoLink {
  href: string;
  timestampLabel: string | null;
}

/**
 * Solo se enlazan videos http(s). El timestamp se agrega al enlace únicamente
 * en YouTube; en otros proveedores la URL se mantiene intacta.
 */
function videoLinkFor(entry: PlayerHistoryEntryResponse): VideoLink | null {
  const safeUrl = safeHttpUrl(entry.videoUrl);

  if (!safeUrl) {
    return null;
  }

  const seconds = entry.videoTimestampSeconds;

  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 0) {
    return { href: safeUrl, timestampLabel: null };
  }

  const timestampLabel = `Desde ${formatVideoTimestamp(seconds)}`;
  const url = new URL(safeUrl);

  if (isYouTubeHost(url.hostname)) {
    url.searchParams.set("t", `${Math.floor(seconds)}s`);
    return { href: url.toString(), timestampLabel };
  }

  return { href: safeUrl, timestampLabel };
}

function VideoCell({ entry }: { entry: PlayerHistoryEntryResponse }) {
  const video = videoLinkFor(entry);
  const description = entry.videoDescription?.trim();

  if (!video) {
    return <>—</>;
  }

  return (
    <>
      <a
        href={video.href}
        target="_blank"
        rel="noreferrer noopener"
        title={description ? description : undefined}
        aria-label={`Ver video del ${formatDate(
          entry.activityDate,
        )} (se abre en una pestaña nueva)`}
      >
        Ver video
      </a>
      {video.timestampLabel ? (
        <span className="cellMuted">{video.timestampLabel}</span>
      ) : null}
    </>
  );
}

export function PlayerHistoryPanel({
  playerId,
  canManage,
}: {
  playerId: number;
  canManage: boolean;
}) {
  const { markSessionExpired } = useAuth();
  const [page, setPage] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] =
    useState<PageResponse<PlayerHistoryEntryResponse> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadedRequestKey, setLoadedRequestKey] = useState<string | null>(null);

  const requestKey = `${playerId}:${page}:${reloadKey}`;
  const isLoading = loadedRequestKey !== requestKey;

  useEffect(() => {
    const controller = new AbortController();
    let isActive = true;

    listPlayerHistory(
      playerId,
      { page, size: PAGE_SIZE, sort: "activityDate,desc" },
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
            : "No se pudo cargar la trayectoria.",
        );
        setLoadedRequestKey(requestKey);
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [playerId, page, reloadKey, requestKey, markSessionExpired]);

  const totalPages = result?.totalPages ?? 0;
  const totalElements = result?.totalElements ?? 0;
  const currentPage = result?.page ?? page;
  const hasPrevious = page > 0;
  const hasNext = totalPages > 0 && page + 1 < totalPages;

  return (
    <section className="card" aria-labelledby="player-history-title">
      <div className="tableHeader">
        <div>
          <h2 className="cardTitle" id="player-history-title">
            Trayectoria
          </h2>
          {result ? (
            <p className="tableCount">
              {totalElements}{" "}
              {totalElements === 1 ? "registro" : "registros"}
            </p>
          ) : null}
        </div>
        {canManage ? (
          <Link
            className="button buttonPrimary buttonSmall"
            href={playerHistoryCreatePath(playerId)}
          >
            Nueva entrada
          </Link>
        ) : null}
      </div>

      {isLoading ? (
        <InlineLoading message="Cargando trayectoria…" />
      ) : loadError ? (
        <Alert variant="error" title="No se pudo cargar la trayectoria">
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
        <StatePanel title="Sin historial deportivo">
          <p>
            Aún no hay actividades registradas. Las entradas nuevas se agregan y
            las correcciones conservan la autoría original.
          </p>
        </StatePanel>
      ) : (
        <>
          <div className="tableWrap">
            <table className="dataTable">
              <caption className="srOnly">Historial deportivo del jugador</caption>
              <thead>
                <tr>
                  <th scope="col">Fecha</th>
                  <th scope="col">Actividad</th>
                  <th scope="col">Rival / competición</th>
                  <th scope="col">Video</th>
                  <th scope="col">Participación</th>
                  <th scope="col">Resultado</th>
                  <th scope="col">Min.</th>
                  <th scope="col">Goles</th>
                  <th scope="col">Asist.</th>
                  <th scope="col">Tarjetas</th>
                  <th scope="col">Rating</th>
                  <th scope="col">Autor</th>
                  {canManage ? <th scope="col">Acciones</th> : null}
                </tr>
              </thead>
              <tbody>
                {result.content.map((entry) => (
                  <tr key={entry.id}>
                    <td>{formatDate(entry.activityDate)}</td>
                    <td>
                      <span className="cellStrong">
                        {activityTypeLabel(entry.activityType)}
                      </span>
                      <span className="cellMuted">
                        {positionLabel(entry.positionPlayed)} ·{" "}
                        {ageCategoryLabel(entry.ageCategory)} ·{" "}
                        {competitiveLevelLabel(entry.competitiveLevel)}
                      </span>
                    </td>
                    <td>
                      <span>{entry.opponent || "—"}</span>
                      <span className="cellMuted">
                        {entry.competition || "—"}
                      </span>
                    </td>
                    <td>
                      <VideoCell entry={entry} />
                    </td>
                    <td>{participationLabel(entry.participation)}</td>
                    <td>
                      <span>{teamResultLabel(entry.teamResult)}</span>
                      <span className="cellMuted">{scoreLabel(entry)}</span>
                    </td>
                    <td>{nullableNumber(entry.minutesPlayed)}</td>
                    <td>{nullableNumber(entry.playerGoals)}</td>
                    <td>{nullableNumber(entry.assists)}</td>
                    <td>
                      {nullableNumber(entry.yellowCards)} /{" "}
                      {nullableNumber(entry.redCards)}
                    </td>
                    <td>
                      {typeof entry.ratings?.overall === "number"
                        ? entry.ratings.overall
                        : "—"}
                    </td>
                    <td>
                      {entry.author
                        ? `${entry.author.firstName} ${entry.author.lastName}`
                        : "—"}
                    </td>
                    {canManage ? (
                      <td>
                        <Link
                          className="button buttonSecondary buttonSmall"
                          href={playerHistoryEditPath(playerId, entry.id)}
                        >
                          Corregir
                        </Link>
                      </td>
                    ) : null}
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
