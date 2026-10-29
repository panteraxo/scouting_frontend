"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { InlineLoading, StatePanel } from "@/components/ui/loading";
import { useAuth } from "@/features/auth/auth-provider";
import { ApiError, isAbortError } from "@/lib/api-client";
import type {
  PlayerDetailResponse,
  PlayerHistoryCorrectionInput,
  PlayerHistoryEntryResponse,
  PlayerHistoryInput,
} from "@/types/api";
import { canManagePlayers } from "../access";
import { playerFullName } from "../catalogs";
import {
  correctPlayerHistory,
  createPlayerHistory,
  getPlayer,
  getPlayerHistory,
} from "../players-api";
import { playerDetailPath, PLAYERS_PATH } from "../routes";
import { PlayerAccessRestricted } from "./player-access-restricted";
import { PlayerHistoryForm } from "./player-history-form";

export function PlayerHistoryFormScreen({
  mode,
}: {
  mode: "create" | "edit";
}) {
  const { user, markSessionExpired } = useAuth();
  const role = user?.role;
  const allowed = canManagePlayers(role);
  const params = useParams();
  const rawPlayerId = params.id;
  const playerIdValue = Array.isArray(rawPlayerId)
    ? rawPlayerId[0]
    : rawPlayerId;
  const playerId = Number(playerIdValue);
  const hasValidPlayerId = Number.isInteger(playerId) && playerId > 0;

  const rawHistoryId = params.historyId;
  const historyIdValue = Array.isArray(rawHistoryId)
    ? rawHistoryId[0]
    : rawHistoryId;
  const historyId = Number(historyIdValue);
  const hasValidHistoryId = Number.isInteger(historyId) && historyId > 0;

  const [player, setPlayer] = useState<PlayerDetailResponse | null>(null);
  const [entry, setEntry] = useState<PlayerHistoryEntryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [saved, setSaved] = useState<PlayerHistoryEntryResponse | null>(null);

  useEffect(() => {
    if (
      !allowed ||
      !hasValidPlayerId ||
      (mode === "edit" && !hasValidHistoryId)
    ) {
      return;
    }

    const controller = new AbortController();
    let isActive = true;

    const playerRequest = getPlayer(playerId, controller.signal);
    const entryRequest =
      mode === "edit"
        ? getPlayerHistory(playerId, historyId, controller.signal)
        : Promise.resolve(null);

    Promise.all([playerRequest, entryRequest])
      .then(([playerData, entryData]) => {
        if (!isActive) {
          return;
        }

        setPlayer(playerData);
        setEntry(entryData);
        setLoadError(null);
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
        setEntry(null);
        setLoadError(
          error instanceof Error
            ? error.message
            : "No se pudo cargar la información del jugador.",
        );
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [
    allowed,
    mode,
    hasValidPlayerId,
    hasValidHistoryId,
    playerId,
    historyId,
    reloadKey,
    markSessionExpired,
  ]);

  if (!allowed) {
    return (
      <PlayerAccessRestricted
        title={mode === "edit" ? "Corregir historial" : "Nueva entrada"}
        message="Solo Administradores, directores y profesores de academia pueden registrar o corregir historial deportivo."
      />
    );
  }

  const invalidId =
    !hasValidPlayerId || (mode === "edit" && !hasValidHistoryId);

  if (invalidId) {
    return (
      <div>
        <header className="pageHeader">
          <div>
            <p className="eyebrow">JUGADORES · HISTORIAL</p>
            <h1>Ruta no válida</h1>
            <p>La dirección de esta página no es válida.</p>
          </div>
        </header>
        <StatePanel
          title="No se pudo abrir el formulario"
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

  async function handleSubmit(
    input: PlayerHistoryInput | PlayerHistoryCorrectionInput,
  ): Promise<PlayerHistoryEntryResponse | undefined> {
    const result =
      mode === "edit"
        ? await correctPlayerHistory(
            playerId,
            historyId,
            input as PlayerHistoryCorrectionInput,
          )
        : await createPlayerHistory(playerId, input as PlayerHistoryInput);

    if (result) {
      setSaved(result);
    }
    return result;
  }

  const fullPlayer =
    player && "birthDate" in player ? player : null;
  const profileInactive =
    player && "operationalStatus" in player
      ? player.operationalStatus === "INACTIVE"
      : false;
  const staffBlocked = profileInactive && role !== "ADMIN";

  return (
    <div>
      <header className="pageHeader">
        <div>
          <p className="eyebrow">JUGADORES · HISTORIAL</p>
          <h1>
            {mode === "edit" ? "Corregir entrada" : "Nueva entrada de historial"}
          </h1>
          <p>
            {player
              ? `${playerFullName(player)} · Registra la actividad y su valoración. El autor y la versión se registran automáticamente.`
              : "Registra una actividad del historial deportivo."}
          </p>
        </div>
        <Link
          className="button buttonSecondary"
          href={playerDetailPath(playerId)}
        >
          Volver a la ficha
        </Link>
      </header>

      {saved ? (
        <Alert variant="success" title="Historial guardado">
          <p>
            La entrada fue {mode === "edit" ? "corregida" : "registrada"}{" "}
            correctamente. Revisión {saved.revisionNumber}.
          </p>
        </Alert>
      ) : null}

      {isLoading ? (
        <InlineLoading message="Cargando formulario…" />
      ) : loadError || !player ? (
        <Alert variant="error" title="No se pudo cargar el formulario">
          <p>{loadError ?? "La información no está disponible."}</p>
          <button
            className="linkButton"
            type="button"
            onClick={() => setReloadKey((current) => current + 1)}
          >
            Reintentar
          </button>
        </Alert>
      ) : staffBlocked ? (
        <StatePanel
          title="Perfil inhabilitado"
          action={
            <Link
              className="button buttonSecondary"
              href={playerDetailPath(playerId)}
            >
              Volver a la ficha
            </Link>
          }
        >
          <p>
            El perfil está en solo lectura para el personal de la academia. Solo
            un administrador puede reactivarlo.
          </p>
        </StatePanel>
      ) : mode === "edit" && !entry ? (
        <Alert variant="error" title="No se pudo cargar la entrada">
          <p>La entrada de historial no existe o no tienes acceso a ella.</p>
        </Alert>
      ) : (
        <>
          {saved ? (
            <div className="formActions sectionSpacer">
              <Link
                className="button buttonPrimary"
                href={playerDetailPath(playerId)}
              >
                Volver a la ficha
              </Link>
              <Link
                className="button buttonSecondary"
                href={PLAYERS_PATH}
              >
                Ir al listado
              </Link>
            </div>
          ) : (
            <section className="card">
              <PlayerHistoryForm
                mode={mode}
                initial={entry ?? undefined}
                playerName={playerFullName(player)}
                birthDate={fullPlayer?.birthDate ?? null}
                submitLabel={
                  mode === "edit" ? "Guardar corrección" : "Registrar entrada"
                }
                cancelHref={playerDetailPath(playerId)}
                onSubmit={handleSubmit}
                warning={
                  mode === "edit" ? (
                    <Alert variant="warning" title="Corrección auditada">
                      <p>
                        Se conserva el autor original, se registra el usuario que
                        corrige y se incrementa el número de revisión. No se elimina
                        la entrada anterior.
                      </p>
                    </Alert>
                  ) : null
                }
              />
            </section>
          )}
        </>
      )}
    </div>
  );
}
