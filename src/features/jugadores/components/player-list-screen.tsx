/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { SelectField, TextField } from "@/components/ui/form-field";
import { InlineLoading, StatePanel } from "@/components/ui/loading";
import { useAuth } from "@/features/auth/auth-provider";
import {
  safeHttpUrl,
  verificationBadgeClass,
  verificationLabel,
} from "@/features/organizations/labels";
import { ApiError, isAbortError } from "@/lib/api-client";
import type {
  OperationalStatus,
  PageResponse,
  PlayerDirectoryItem,
  PlayerListQuery,
  PlayerOperationalStatus,
  PlayerPosition,
  PlayerProfileStatus,
  PositionGroup,
  UserRole,
} from "@/types/api";
import {
  canCreatePlayers,
  canViewPlayers,
} from "../access";
import {
  formatAge,
  formatExperience,
  formatHeight,
  formatResidence,
  formatWeight,
  playerFullName,
  POSITION_GROUP_OPTIONS,
  POSITION_OPTIONS,
  positionLabel,
  PROFILE_STATUS_LABELS,
  OPERATIONAL_STATUS_LABELS,
} from "../catalogs";
import { listPlayerAcademyOptions, listPlayers } from "../players-api";
import {
  playerDetailPath,
  PLAYER_CREATE_PATH,
} from "../routes";
import { PlayerAccessRestricted } from "./player-access-restricted";
import {
  PlayerUbigeoFilter,
  type PlayerUbigeoValue,
} from "./player-ubigeo-filter";

const PAGE_SIZE = 20;

interface AppliedFilters {
  q?: string;
  position?: PlayerPosition;
  positionGroup?: PositionGroup;
  ageMin?: number;
  ageMax?: number;
  regionCode?: string;
  provinceCode?: string;
  districtCode?: string;
  academyId?: number;
  operationalStatus?: PlayerOperationalStatus;
  profileStatus?: PlayerProfileStatus;
}

interface AcademyOption {
  id: number;
  name: string;
  code: string;
  operationalStatus: OperationalStatus;
}

const EMPTY_UBIGEO: PlayerUbigeoValue = {
  departmentCode: "",
  provinceCode: "",
  districtCode: "",
};

function statusBadgeClass(status: PlayerOperationalStatus): string {
  return status === "ACTIVE"
    ? "statusBadge statusActive"
    : "statusBadge statusInactive";
}

function profileBadgeClass(status: PlayerProfileStatus): string {
  return status === "COMPLETE"
    ? "statusBadge statusVerified"
    : "statusBadge statusPending";
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

function PlayerCard({
  player,
  isScout,
}: {
  player: PlayerDirectoryItem;
  isScout: boolean;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const fullName = playerFullName(player);
  const photoUrl = safeHttpUrl(player.photoUrl);
  const academy = player.academy;
  const hasBadges = Boolean(
    player.profileStatus ||
      player.operationalStatus ||
      (isScout && academy),
  );

  return (
    <article
      className="playerCard"
      aria-labelledby={`player-card-title-${player.id}`}
    >
      <div className="playerCardMedia">
        {photoUrl && !imageFailed ? (
          <img
            className="playerCardImage"
            src={photoUrl}
            alt={`Foto de ${fullName}`}
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span className="playerCardMediaFallback" aria-hidden="true">
            {initialsOf(fullName)}
          </span>
        )}
      </div>

      <div className="playerCardBody">
        <div>
          <h3 className="playerCardTitle" id={`player-card-title-${player.id}`}>
            {fullName}
          </h3>
          <p className="playerCardSubtitle">
            {formatAge(player.age)} · {positionLabel(player.position)}
          </p>
        </div>

        <dl className="playerCardMeta">
          <div className="playerCardMetaWide">
            <dt>Residencia</dt>
            <dd>{formatResidence(player.residence, !isScout)}</dd>
          </div>
          <div className="playerCardMetaWide">
            <dt>Academia</dt>
            <dd>
              {academy ? (
                <>
                  <span className="playerCardAcademyName">{academy.name}</span>
                  <span className="playerCardAcademyCode">{academy.code}</span>
                </>
              ) : (
                "Sin academia"
              )}
            </dd>
          </div>
          <div>
            <dt>Talla</dt>
            <dd>{formatHeight(player.heightCm)}</dd>
          </div>
          <div>
            <dt>Peso</dt>
            <dd>{formatWeight(player.weightKg)}</dd>
          </div>
          <div className="playerCardMetaWide">
            <dt>Experiencia</dt>
            <dd>{formatExperience(player.yearsExperience)}</dd>
          </div>
        </dl>

        {hasBadges ? (
          <div className="playerCardBadges">
            {player.profileStatus ? (
              <span className={profileBadgeClass(player.profileStatus)}>
                Perfil: {PROFILE_STATUS_LABELS[player.profileStatus]}
              </span>
            ) : null}
            {player.operationalStatus ? (
              <span className={statusBadgeClass(player.operationalStatus)}>
                {OPERATIONAL_STATUS_LABELS[player.operationalStatus]}
              </span>
            ) : null}
            {isScout && academy ? (
              <span
                className={verificationBadgeClass(academy.verificationStatus)}
              >
                {verificationLabel(academy.verificationStatus)}
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="playerCardActions">
          <Link
            className="button buttonSecondary buttonSmall"
            href={playerDetailPath(player.id)}
            aria-label={`Ver ficha de ${fullName}`}
          >
            Ver ficha
          </Link>
        </div>
      </div>
    </article>
  );
}

export function PlayerListScreen() {
  const { user, markSessionExpired } = useAuth();
  const role = user?.role;
  const allowed = canViewPlayers(role);
  const isScout = role === "SCOUT";
  const canUseAcademyFilter = role === "ADMIN" || role === "SCOUT";
  const canUseStatusFilters = role !== "SCOUT";

  const [qDraft, setQDraft] = useState("");
  const [positionDraft, setPositionDraft] = useState<"" | PlayerPosition>("");
  const [groupDraft, setGroupDraft] = useState<"" | PositionGroup>("");
  const [ageMinDraft, setAgeMinDraft] = useState("");
  const [ageMaxDraft, setAgeMaxDraft] = useState("");
  const [ageError, setAgeError] = useState<string | undefined>();
  const [ubigeoDraft, setUbigeoDraft] =
    useState<PlayerUbigeoValue>(EMPTY_UBIGEO);
  const [academyDraft, setAcademyDraft] = useState("");
  const [operationalDraft, setOperationalDraft] = useState<
    "" | PlayerOperationalStatus
  >("");
  const [profileDraft, setProfileDraft] = useState<"" | PlayerProfileStatus>(
    "",
  );
  const [filters, setFilters] = useState<AppliedFilters>({});
  const [page, setPage] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] =
    useState<PageResponse<PlayerDirectoryItem> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadedRequestKey, setLoadedRequestKey] = useState<string | null>(null);
  const [academies, setAcademies] = useState<AcademyOption[]>([]);
  const [academiesError, setAcademiesError] = useState<string | null>(null);

  const requestKey = `${page}:${JSON.stringify(filters)}:${reloadKey}`;
  const isLoading = loadedRequestKey !== requestKey;

  useEffect(() => {
    if (!allowed) {
      return;
    }

    const controller = new AbortController();
    let isActive = true;

    const query: PlayerListQuery = {
      page,
      size: PAGE_SIZE,
      q: filters.q,
      position: filters.position,
      positionGroup: filters.positionGroup,
      ageMin: filters.ageMin,
      ageMax: filters.ageMax,
      regionCode: filters.regionCode,
      provinceCode: filters.provinceCode,
      districtCode: isScout ? undefined : filters.districtCode,
      academyId: canUseAcademyFilter ? filters.academyId : undefined,
      operationalStatus: canUseStatusFilters
        ? filters.operationalStatus
        : undefined,
      profileStatus: canUseStatusFilters ? filters.profileStatus : undefined,
    };

    listPlayers(query, controller.signal)
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
            : "No se pudo cargar el listado de jugadores.",
        );
        setLoadedRequestKey(requestKey);
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [
    allowed,
    isScout,
    canUseAcademyFilter,
    canUseStatusFilters,
    page,
    filters,
    reloadKey,
    requestKey,
    markSessionExpired,
  ]);

  useEffect(() => {
    if (!allowed || !canUseAcademyFilter || !role) {
      return;
    }

    const controller = new AbortController();
    let isActive = true;

    listPlayerAcademyOptions(
      role as UserRole,
      role === "ADMIN" ? false : true,
      controller.signal,
    )
      .then((data) => {
        if (isActive) {
          setAcademies(data);
          setAcademiesError(null);
        }
      })
      .catch((error: unknown) => {
        if (!isActive || isAbortError(error)) {
          return;
        }

        setAcademiesError(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar las academias.",
        );
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [allowed, canUseAcademyFilter, role]);

  if (!allowed) {
    return (
      <PlayerAccessRestricted
        title="Jugadores"
        message="Esta sección está disponible para Administradores, directores y profesores de academia y ojeadores."
      />
    );
  }

  function handleApply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const minRaw = ageMinDraft.trim();
    const maxRaw = ageMaxDraft.trim();
    const ageMin = minRaw ? Number(minRaw) : undefined;
    const ageMax = maxRaw ? Number(maxRaw) : undefined;

    if (
      ageMin !== undefined &&
      (!Number.isInteger(ageMin) || ageMin < 0 || ageMin > 100)
    ) {
      setAgeError("La edad desde debe ser un entero entre 0 y 100.");
      return;
    }

    if (
      ageMax !== undefined &&
      (!Number.isInteger(ageMax) || ageMax < 0 || ageMax > 100)
    ) {
      setAgeError("La edad hasta debe ser un entero entre 0 y 100.");
      return;
    }

    if (
      ageMin !== undefined &&
      ageMax !== undefined &&
      ageMin > ageMax
    ) {
      setAgeError("La edad desde no puede superar la edad hasta.");
      return;
    }

    setAgeError(undefined);
    setFilters({
      q: qDraft.trim() || undefined,
      position: positionDraft || undefined,
      positionGroup: groupDraft || undefined,
      ageMin,
      ageMax,
      regionCode: ubigeoDraft.departmentCode || undefined,
      provinceCode: ubigeoDraft.provinceCode || undefined,
      districtCode: isScout
        ? undefined
        : ubigeoDraft.districtCode || undefined,
      academyId:
        canUseAcademyFilter && academyDraft
          ? Number(academyDraft)
          : undefined,
      operationalStatus: canUseStatusFilters
        ? operationalDraft || undefined
        : undefined,
      profileStatus: canUseStatusFilters ? profileDraft || undefined : undefined,
    });
    setPage(0);
  }

  function handleReset() {
    setQDraft("");
    setPositionDraft("");
    setGroupDraft("");
    setAgeMinDraft("");
    setAgeMaxDraft("");
    setAgeError(undefined);
    setUbigeoDraft(EMPTY_UBIGEO);
    setAcademyDraft("");
    setOperationalDraft("");
    setProfileDraft("");
    setFilters({});
    setPage(0);
  }

  const totalPages = result?.totalPages ?? 0;
  const totalElements = result?.totalElements ?? 0;
  const currentPage = result?.page ?? page;
  const pageSize = result?.size ?? PAGE_SIZE;
  const firstResultNumber = currentPage * pageSize + 1;
  const lastResultNumber = firstResultNumber + (result?.content.length ?? 0) - 1;
  const hasPrevious = page > 0;
  const hasNext = totalPages > 0 && page + 1 < totalPages;
  const hasFilters = Object.values(filters).some(
    (value) => value !== undefined,
  );

  return (
    <div>
      <header className="pageHeader">
        <div>
          <p className="eyebrow">JUGADORES</p>
          <h1>Jugadores</h1>
          <p>
            Consulta perfiles deportivos, edad, posición, academia, residencia y
            experiencia. La información mostrada depende de los permisos de tu
            cuenta.
          </p>
        </div>
        {canCreatePlayers(role) ? (
          <Link className="button buttonPrimary" href={PLAYER_CREATE_PATH}>
            Nuevo jugador
          </Link>
        ) : null}
      </header>

      {isScout ? (
        <Alert variant="info" title="Vista de ojeador">
          <p>
            Solo se muestran perfiles activos y completos de cuentas activas y
            academias operativamente activas. No se muestran filtros de estado ni
            distrito. La verificación de la academia puede estar pendiente o
            rechazada y se indica en la ficha.
          </p>
        </Alert>
      ) : null}

      <section
        className="card playerFilterCard"
        aria-labelledby="player-filters-title"
      >
        <h2 className="cardTitle" id="player-filters-title">
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
              placeholder="Nombre o apellido"
              maxLength={100}
            />

            <SelectField
              label="Posición"
              name="position"
              value={positionDraft}
              onChange={(event) =>
                setPositionDraft(event.target.value as "" | PlayerPosition)
              }
            >
              <option value="">Todas las posiciones</option>
              {POSITION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectField>

            <SelectField
              label="Línea de juego"
              name="positionGroup"
              value={groupDraft}
              onChange={(event) =>
                setGroupDraft(event.target.value as "" | PositionGroup)
              }
            >
              <option value="">Todas las líneas</option>
              {POSITION_GROUP_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectField>

            <TextField
              label="Edad desde"
              name="ageMin"
              type="number"
              min={0}
              max={100}
              value={ageMinDraft}
              onChange={(event) => {
                setAgeMinDraft(event.target.value);
                setAgeError(undefined);
              }}
              error={ageError}
            />

            <TextField
              label="Edad hasta"
              name="ageMax"
              type="number"
              min={0}
              max={100}
              value={ageMaxDraft}
              onChange={(event) => {
                setAgeMaxDraft(event.target.value);
                setAgeError(undefined);
              }}
              error={ageError}
            />
          </div>

          <div className="filterGrid playerFilterGrid sectionSpacer">
            <PlayerUbigeoFilter
              value={ubigeoDraft}
              includeDistrict={!isScout}
              onChange={setUbigeoDraft}
            />

            {canUseAcademyFilter ? (
              <SelectField
                label="Academia actual"
                name="academyId"
                value={academyDraft}
                onChange={(event) => setAcademyDraft(event.target.value)}
                hint={
                  academiesError ??
                  (role === "SCOUT"
                    ? "Solo academias activas y verificadas."
                    : undefined)
                }
              >
                <option value="">Todas las academias</option>
                {academies.map((academy) => (
                  <option key={academy.id} value={academy.id}>
                    {academy.name} ({academy.code})
                    {academy.operationalStatus === "INACTIVE"
                      ? " · Inhabilitada"
                      : ""}
                  </option>
                ))}
              </SelectField>
            ) : null}

            {canUseStatusFilters ? (
              <>
                <SelectField
                  label="Estado del perfil"
                  name="profileStatus"
                  value={profileDraft}
                  onChange={(event) =>
                    setProfileDraft(
                      event.target.value as "" | PlayerProfileStatus,
                    )
                  }
                >
                  <option value="">Todos</option>
                  <option value="INCOMPLETE">Incompleto</option>
                  <option value="COMPLETE">Completo</option>
                </SelectField>

                <SelectField
                  label="Estado operativo"
                  name="operationalStatus"
                  value={operationalDraft}
                  onChange={(event) =>
                    setOperationalDraft(
                      event.target.value as "" | PlayerOperationalStatus,
                    )
                  }
                >
                  <option value="">Todos</option>
                  <option value="ACTIVE">Activos</option>
                  <option value="INACTIVE">Inhabilitados</option>
                </SelectField>
              </>
            ) : null}
          </div>

          <div className="filterActions playerFilterActions sectionSpacer">
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
        </form>
      </section>

      <section className="card tableCard" aria-labelledby="player-results-title">
        <div className="tableHeader playerResultsHeader">
          <h2 className="cardTitle" id="player-results-title">
            Resultados
          </h2>
          {result ? (
            <p className="tableCount">
              {result.content.length === 0
                ? "Sin jugadores para mostrar"
                : `Mostrando ${firstResultNumber}–${lastResultNumber} de ${totalElements} ${
                    totalElements === 1 ? "jugador" : "jugadores"
                  }`}
            </p>
          ) : null}
        </div>

        {isLoading ? (
          <InlineLoading message="Cargando jugadores…" />
        ) : loadError ? (
          <Alert variant="error" title="No se pudo cargar el listado">
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
                ? "No hay jugadores con los filtros seleccionados"
                : "Sin jugadores para mostrar"
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
              ) : undefined
            }
          >
            <p>
              {isScout
                ? "Solo aparecen perfiles activos y completos de academias operativas activas."
                : "Puedes registrar un jugador con su cuenta desde Nuevo jugador."}
            </p>
          </StatePanel>
        ) : (
          <>
            <ul className="playerCardGrid" aria-label="Jugadores encontrados">
              {result.content.map((player) => (
                <li key={player.id} className="playerCardItem">
                  <PlayerCard player={player} isScout={isScout} />
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
        {isScout
          ? "Vista de solo lectura. La búsqueda por estado y distrito no está disponible para ojeadores."
          : "Los filtros de residencia usan el distrito de residencia del jugador, no la ubicación de la academia."}{" "}
        La talla y el peso se muestran como «—» cuando el listado no los informa.
      </p>
    </div>
  );
}
