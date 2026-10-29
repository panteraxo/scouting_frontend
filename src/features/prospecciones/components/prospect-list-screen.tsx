/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { SelectField, TextField } from "@/components/ui/form-field";
import { InlineLoading, StatePanel } from "@/components/ui/loading";
import { useAuth } from "@/features/auth/auth-provider";
import { positionLabel } from "@/features/jugadores/catalogs";
import { safeHttpUrl } from "@/features/organizations/labels";
import { ApiError, isAbortError } from "@/lib/api-client";
import type {
  PageResponse,
  ProspectResponse,
  ProspectStatus,
} from "@/types/api";
import { canUseProspects } from "../access";
import {
  formatProspectAge,
  formatProspectDateTime,
  PROSPECT_STATUS_OPTIONS,
  prospectPlayerName,
  prospectStatusBadgeClass,
  prospectStatusLabel,
} from "../catalogs";
import { listProspects } from "../prospects-api";
import {
  prospectCreatePath,
  prospectDetailPath,
} from "../routes";
import { ProspectAccessRestricted } from "./prospect-access-restricted";

const PAGE_SIZE = 20;

interface AppliedFilters {
  status?: ProspectStatus;
  q?: string;
  playerId?: number;
}

function initialsOf(fullName: string): string {
  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return initials || "JP";
}

function ProspectCard({ prospect }: { prospect: ProspectResponse }) {
  const [imageFailed, setImageFailed] = useState(false);
  const fullName = prospectPlayerName(prospect.player);
  const photoUrl = safeHttpUrl(prospect.player.photoUrl);
  const academy = prospect.player.academy;

  return (
    <article
      className="prospectCard"
      aria-labelledby={`prospect-card-title-${prospect.id}`}
    >
      <div className="prospectCardMedia">
        {photoUrl && !imageFailed ? (
          <img
            className="prospectCardImage"
            src={photoUrl}
            alt={`Foto de ${fullName}`}
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span className="prospectCardMediaFallback" aria-hidden="true">
            {initialsOf(fullName)}
          </span>
        )}
        <span className={`prospectCardStatus ${prospectStatusBadgeClass(prospect.status)}`}>
          {prospectStatusLabel(prospect.status)}
        </span>
      </div>

      <div className="prospectCardBody">
        <h3
          className="prospectCardName"
          id={`prospect-card-title-${prospect.id}`}
        >
          {fullName}
        </h3>
        <p className="prospectCardMeta">
          {formatProspectAge(prospect.player.age)} ·{" "}
          {positionLabel(prospect.player.position)}
        </p>
        <p className="prospectCardAcademy">
          {academy ? academy.name : "Sin academia"}
        </p>

        <dl className="prospectCardInfo">
          <div>
            <dt>Última actividad</dt>
            <dd>{formatProspectDateTime(prospect.lastActivityAt)}</dd>
          </div>
          <div>
            <dt>Inicio del seguimiento</dt>
            <dd>{formatProspectDateTime(prospect.startedAt)}</dd>
          </div>
        </dl>

        <div className="prospectCardActions">
          <Link
            className="button buttonSecondary buttonSmall"
            href={prospectDetailPath(prospect.id)}
            aria-label={`Ver detalle de ${fullName}`}
          >
            Ver detalle
          </Link>
        </div>
      </div>
    </article>
  );
}

export function ProspectListScreen() {
  const { user, markSessionExpired } = useAuth();
  const allowed = canUseProspects(user?.role);
  const searchParams = useSearchParams();
  const rawPlayerId = Number(searchParams.get("playerId"));
  const initialPlayerId =
    Number.isInteger(rawPlayerId) && rawPlayerId > 0 ? rawPlayerId : undefined;

  const [qDraft, setQDraft] = useState("");
  const [statusDraft, setStatusDraft] = useState<"" | ProspectStatus>("");
  const [filters, setFilters] = useState<AppliedFilters>({
    playerId: initialPlayerId,
  });
  const [page, setPage] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] =
    useState<PageResponse<ProspectResponse> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadedRequestKey, setLoadedRequestKey] = useState<string | null>(null);

  const requestKey = `${page}:${JSON.stringify(filters)}:${reloadKey}`;
  const isLoading = loadedRequestKey !== requestKey;

  useEffect(() => {
    if (!allowed) {
      return;
    }

    const controller = new AbortController();
    let isActive = true;

    listProspects(
      {
        page,
        size: PAGE_SIZE,
        sort: "lastActivityAt,desc",
        status: filters.status,
        q: filters.q,
        playerId: filters.playerId,
      },
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
            : "No se pudieron cargar las prospecciones.",
        );
        setLoadedRequestKey(requestKey);
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [
    allowed,
    page,
    filters,
    reloadKey,
    requestKey,
    markSessionExpired,
  ]);

  if (!allowed) {
    return (
      <ProspectAccessRestricted
        title="Prospección"
        message="Este módulo es privado del ojeador autenticado."
      />
    );
  }

  function handleApply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFilters({
      status: statusDraft || undefined,
      q: qDraft.trim() || undefined,
      playerId: filters.playerId,
    });
    setPage(0);
  }

  function handleReset() {
    setQDraft("");
    setStatusDraft("");
    setFilters({});
    setPage(0);
  }

  function clearPlayerFilter() {
    setFilters((current) => ({ ...current, playerId: undefined }));
    setPage(0);
  }

  const totalPages = result?.totalPages ?? 0;
  const totalElements = result?.totalElements ?? 0;
  const currentPage = result?.page ?? page;
  const hasPrevious = page > 0;
  const hasNext = totalPages > 0 && page + 1 < totalPages;
  const hasFilters =
    Boolean(filters.status) ||
    Boolean(filters.q) ||
    filters.playerId !== undefined;

  return (
    <div>
      <header className="pageHeader">
        <div>
          <p className="eyebrow">MI PROSPECCIÓN</p>
          <h1>Prospección</h1>
          <p>Busca, evalúa y da seguimiento al talento futbolístico.</p>
        </div>
        <Link
          className="button buttonPrimary"
          href={
            filters.playerId
              ? prospectCreatePath(filters.playerId)
              : "/jugadores"
          }
        >
          {filters.playerId ? "Nueva prospección" : "Nueva búsqueda"}
        </Link>
      </header>

      {filters.playerId ? (
        <Alert variant="info" title="Filtro por jugador">
          <p>
            Mostrando únicamente la prospección del jugador seleccionado.
          </p>
          <button
            className="linkButton"
            type="button"
            onClick={clearPlayerFilter}
          >
            Quitar filtro de jugador
          </button>
        </Alert>
      ) : null}

      <section className="card playerFilterCard" aria-labelledby="prospect-filters">
        <h2 className="cardTitle" id="prospect-filters">
          Filtros
        </h2>
        <form onSubmit={handleApply}>
          <div className="filterGrid playerFilterGrid">
            <TextField
              label="Buscar jugador"
              name="q"
              type="search"
              value={qDraft}
              onChange={(event) => setQDraft(event.target.value)}
              placeholder="Nombres o apellidos"
              maxLength={100}
            />
            <SelectField
              label="Estado"
              name="status"
              value={statusDraft}
              onChange={(event) =>
                setStatusDraft(event.target.value as "" | ProspectStatus)
              }
            >
              <option value="">Todos</option>
              {PROSPECT_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectField>
            <div className="filterActions">
              <button
                className="button buttonPrimary buttonSmall"
                type="submit"
                disabled={isLoading}
              >
                Aplicar filtros
              </button>
              <button
                className="button buttonSecondary buttonSmall"
                type="button"
                onClick={handleReset}
                disabled={isLoading}
              >
                Limpiar
              </button>
            </div>
          </div>
        </form>
      </section>

      <section className="card tableCard" aria-labelledby="prospect-results">
        <div className="tableHeader playerResultsHeader">
          <div>
            <h2 className="cardTitle" id="prospect-results">
              Jugadores seguidos
            </h2>
            {result ? (
              <p className="tableCount">
                {totalElements}{" "}
                {totalElements === 1 ? "jugador" : "jugadores"}
              </p>
            ) : null}
          </div>
        </div>

        {isLoading ? (
          <InlineLoading message="Cargando prospecciones…" />
        ) : loadError ? (
          <Alert variant="error" title="No se pudieron cargar las prospecciones">
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
          <StatePanel
            title={
              hasFilters
                ? "No hay prospecciones con los filtros seleccionados"
                : "Todavía no sigues a ningún jugador"
            }
            action={
              hasFilters ? (
                <button
                  className="button buttonSecondary buttonSmall"
                  type="button"
                  onClick={handleReset}
                >
                  Limpiar filtros
                </button>
              ) : (
                <Link className="button buttonPrimary buttonSmall" href="/jugadores">
                  Buscar jugadores
                </Link>
              )
            }
          >
            <p>
              {hasFilters
                ? "Ajusta el estado o la búsqueda para encontrar el seguimiento."
                : "Abre la ficha de un jugador desde Jugadores y pulsa Seguir para iniciar una prospección."}
            </p>
          </StatePanel>
        ) : (
          <>
            <ul className="prospectCardGrid" aria-label="Jugadores seguidos">
              {result.content.map((prospect) => (
                <li key={prospect.id} className="prospectCardItem">
                  <ProspectCard prospect={prospect} />
                </li>
              ))}
            </ul>

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
        Lista privada del ojeador autenticado. Las notas y evaluaciones no se
        comparten con Admin, academia, club ni jugador. No se muestran métricas
        ni totales que no estén registrados.
      </p>
    </div>
  );
}
