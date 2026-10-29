"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { InlineLoading, StatePanel } from "@/components/ui/loading";
import { useAuth } from "@/features/auth/auth-provider";
import { ConfirmDialog } from "@/features/organizations/components/confirm-dialog";
import { ScoutProspectAction } from "@/features/prospecciones/components/scout-prospect-action";
import { ApiError, isAbortError } from "@/lib/api-client";
import type {
  PlayerDetailResponse,
  PlayerOperationalStatus,
} from "@/types/api";
import {
  canAccessGuardian,
  canManagePlayers,
  canViewPlayers,
  isPlayer,
} from "../access";
import { OPERATIONAL_STATUS_LABELS, playerFullName } from "../catalogs";
import {
  getMyPlayer,
  getPlayer,
  updatePlayerStatus,
} from "../players-api";
import {
  playerEditPath,
  playerGuardianPath,
  playerHistoryCreatePath,
  PLAYERS_PATH,
} from "../routes";
import { PlayerAccessRestricted } from "./player-access-restricted";
import { PlayerHero } from "./player-hero";
import { PlayerHistoryPanel } from "./player-history-panel";
import { PlayerScoutEvaluations } from "@/features/prospecciones/components/player-scout-evaluations";
import { PlayerStatsPanel } from "./player-stats";
import { PlayerSummary } from "./player-summary";

type PlayerTab = "summary" | "stats" | "history";

export function PlayerDetailScreen({
  mode,
}: {
  mode: "directory" | "own";
}) {
  const { user, markSessionExpired } = useAuth();
  const role = user?.role;
  const params = useParams();
  const rawId = params.id;
  const idValue = Array.isArray(rawId) ? rawId[0] : rawId;
  const id = Number(idValue);
  const hasValidId = Number.isInteger(id) && id > 0;

  const allowed =
    mode === "own" ? isPlayer(role) : canViewPlayers(role);
  const canManage = mode === "directory" && canManagePlayers(role);

  const [player, setPlayer] = useState<PlayerDetailResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [loadedRequestKey, setLoadedRequestKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<PlayerTab>("summary");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] =
    useState<PlayerOperationalStatus | null>(null);
  const [statusProcessing, setStatusProcessing] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const requestKey = mode === "own" ? `me:${reloadKey}` : `${id}:${reloadKey}`;
  const isLoading = loadedRequestKey !== requestKey;

  useEffect(() => {
    if (!allowed) {
      return;
    }

    if (mode === "directory" && !hasValidId) {
      return;
    }

    const controller = new AbortController();
    let isActive = true;

    const request =
      mode === "own"
        ? getMyPlayer(controller.signal)
        : getPlayer(id, controller.signal);

    request
      .then((data) => {
        if (!isActive) {
          return;
        }

        setPlayer(data);
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

        setPlayer(null);
        setLoadError(
          error instanceof ApiError && error.status === 404
            ? mode === "own"
              ? "No tienes un perfil deportivo asociado a tu cuenta."
              : "El jugador no existe o no tienes acceso a su perfil."
            : error instanceof Error
              ? error.message
              : "No se pudo cargar la ficha del jugador.",
        );
        setLoadedRequestKey(requestKey);
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [
    allowed,
    mode,
    hasValidId,
    id,
    reloadKey,
    requestKey,
    markSessionExpired,
  ]);

  if (!allowed) {
    return (
      <PlayerAccessRestricted
        title={mode === "own" ? "Mi perfil" : "Jugadores"}
        message={
          mode === "own"
            ? "Esta sección está disponible solo para cuentas con rol Jugador."
            : "Esta sección está disponible para Administradores, directores y profesores de academia y ojeadores."
        }
      />
    );
  }

  if (mode === "directory" && !hasValidId) {
    return (
      <div>
        <header className="pageHeader">
          <div>
            <p className="eyebrow">JUGADORES</p>
            <h1>Jugador no válido</h1>
            <p>La dirección de esta página no es válida.</p>
          </div>
        </header>
        <StatePanel
          title="No se pudo abrir la ficha"
          action={
            <Link className="button buttonSecondary" href={PLAYERS_PATH}>
              Volver al listado
            </Link>
          }
        >
          <p>Verifica el enlace o regresa al listado de jugadores.</p>
        </StatePanel>
      </div>
    );
  }

  async function handleStatusChange() {
    if (!pendingStatus || !player || statusProcessing) {
      return;
    }

    setStatusProcessing(true);
    setStatusError(null);
    setSuccessMessage(null);
    setPageError(null);

    try {
      const updated = await updatePlayerStatus(player.id, pendingStatus);
      setPendingStatus(null);

      if (updated) {
        setPlayer(updated);
      } else {
        setReloadKey((current) => current + 1);
      }

      setSuccessMessage(
        pendingStatus === "INACTIVE"
          ? "El perfil quedó inhabilitado. El personal de la academia ya no puede editarlo; solo un administrador puede reactivarlo."
          : "El perfil quedó activo nuevamente.",
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setPendingStatus(null);
        markSessionExpired();
        return;
      }

      setStatusError(
        error instanceof Error
          ? error.message
          : "No se pudo cambiar el estado del perfil.",
      );
    } finally {
      setStatusProcessing(false);
    }
  }

  const statusPlayer =
    player && "operationalStatus" in player ? player : null;
  const operationalStatus = statusPlayer?.operationalStatus ?? null;
  const isActive = operationalStatus === "ACTIVE";
  const canManageHistory =
    canManage && (isActive || role === "ADMIN");

  const headerActions = player ? (
    <div className="toolbarActions">
      {canManage && (isActive || role === "ADMIN") ? (
        <Link className="button buttonPrimary" href={playerEditPath(player.id)}>
          Editar
        </Link>
      ) : null}
      {canAccessGuardian(role) &&
      (("guardianRequired" in player && player.guardianRequired) ||
        ("guardianDataAvailable" in player &&
          player.guardianDataAvailable)) ? (
        <Link
          className="button buttonSecondary"
          href={playerGuardianPath(player.id)}
        >
          Tutor
        </Link>
      ) : null}
      {role === "SCOUT" ? (
        <ScoutProspectAction playerId={player.id} />
      ) : null}
      {canManage && operationalStatus ? (
        operationalStatus === "ACTIVE" ? (
          <button
            className="button buttonDanger"
            type="button"
            onClick={() => {
              setStatusError(null);
              setPendingStatus("INACTIVE");
            }}
            disabled={statusProcessing}
          >
            Inhabilitar
          </button>
        ) : role === "ADMIN" ? (
          <button
            className="button buttonPrimary"
            type="button"
            onClick={() => {
              setStatusError(null);
              setPendingStatus("ACTIVE");
            }}
            disabled={statusProcessing}
          >
            Reactivar
          </button>
        ) : null
      ) : null}
      {canManageHistory ? (
        <Link
          className="button buttonSecondary"
          href={playerHistoryCreatePath(player.id)}
        >
          Nueva entrada
        </Link>
      ) : null}
      {mode === "directory" ? (
        <Link className="button buttonGhost" href={PLAYERS_PATH}>
          Volver al listado
        </Link>
      ) : null}
    </div>
  ) : null;

  return (
    <div>
      <nav className="breadcrumb" aria-label="Ruta de navegación">
        {mode === "own" ? (
          <span className="breadcrumbCurrent">Mi perfil</span>
        ) : (
          <>
            <Link className="breadcrumbLink" href={PLAYERS_PATH}>
              Jugadores
            </Link>
            <span className="breadcrumbSeparator" aria-hidden="true">
              /
            </span>
            <span className="breadcrumbCurrent" aria-current="page">
              {player ? playerFullName(player) : "Ficha del jugador"}
            </span>
          </>
        )}
      </nav>

      {successMessage ? (
        <Alert variant="success" title="Perfil actualizado">
          <p>{successMessage}</p>
        </Alert>
      ) : null}

      {pageError ? (
        <Alert variant="error" title="No se pudo completar la acción">
          <p>{pageError}</p>
          <button
            className="linkButton"
            type="button"
            onClick={() => setPageError(null)}
          >
            Cerrar aviso
          </button>
        </Alert>
      ) : null}

      {isLoading ? (
        <InlineLoading message="Cargando ficha del jugador…" />
      ) : loadError || !player ? (
        <Alert variant="error" title="No se pudo cargar la ficha">
          <p>{loadError ?? "El jugador no está disponible."}</p>
          <button
            className="linkButton"
            type="button"
            onClick={() => setReloadKey((current) => current + 1)}
          >
            Reintentar
          </button>
        </Alert>
      ) : (
        <>
          <PlayerHero
            key={player.id}
            player={player}
            role={role ?? "PLAYER"}
            mode={mode}
            actions={headerActions}
          />

          <div
            className="playerTabs"
            role="tablist"
            aria-label="Secciones del jugador"
          >
            {(
              [
                ["summary", "Resumen"],
                ["stats", "Estadísticas"],
                ["history", "Trayectoria"],
              ] as Array<[PlayerTab, string]>
            ).map(([value, label]) => (
              <button
                key={value}
                className={`playerTabButton${activeTab === value ? " playerTabButtonActive" : ""}`}
                type="button"
                role="tab"
                aria-selected={activeTab === value}
                onClick={() => setActiveTab(value)}
              >
                {label}
              </button>
            ))}
          </div>

          {activeTab === "summary" ? (
            <PlayerSummary player={player} role={role ?? "PLAYER"} />
          ) : null}
          {activeTab === "stats" ? (
            <PlayerStatsPanel playerId={player.id} />
          ) : null}
          {activeTab === "history" ? (
            <>
              <PlayerHistoryPanel
                playerId={player.id}
                canManage={canManageHistory}
              />
              {role === "SCOUT" ? (
                <PlayerScoutEvaluations playerId={player.id} />
              ) : null}
            </>
          ) : null}
        </>
      )}

      {pendingStatus ? (
        <ConfirmDialog
          title={
            pendingStatus === "INACTIVE"
              ? "Inhabilitar perfil"
              : "Reactivar perfil"
          }
          description={
            pendingStatus === "INACTIVE"
              ? "El perfil quedará en solo lectura para el personal de la academia. No se elimina el historial ni la cuenta. Solo un administrador puede reactivarlo."
              : "El perfil quedará activo nuevamente y podrá ser gestionado por el personal de la academia."
          }
          confirmLabel={
            pendingStatus === "INACTIVE"
              ? "Confirmar inhabilitación"
              : "Confirmar reactivación"
          }
          variant={pendingStatus === "INACTIVE" ? "danger" : "primary"}
          isProcessing={statusProcessing}
          error={statusError}
          details={
            player ? (
              <>
                <strong>{playerFullName(player)}</strong>
                <span>
                  Estado actual:{" "}
                  {operationalStatus
                    ? OPERATIONAL_STATUS_LABELS[operationalStatus]
                    : "—"}
                </span>
              </>
            ) : null
          }
          onCancel={() => {
            setPendingStatus(null);
            setStatusError(null);
          }}
          onConfirm={handleStatusChange}
        />
      ) : null}

      {mode === "own" ? (
        <p className="footnote">
          Solo lectura. No puedes editar tu perfil ni acceder a datos del tutor.
          Si necesitas una corrección, contacta a tu academia.
        </p>
      ) : null}
    </div>
  );
}
