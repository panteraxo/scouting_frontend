"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { InlineLoading, StatePanel } from "@/components/ui/loading";
import { useAuth } from "@/features/auth/auth-provider";
import { ApiError, isAbortError } from "@/lib/api-client";
import type { PlayerDetailResponse, PlayerUpdateInput } from "@/types/api";
import { canManagePlayers } from "../access";
import { playerFullName } from "../catalogs";
import { getPlayer, updatePlayer } from "../players-api";
import { playerDetailPath, PLAYERS_PATH } from "../routes";
import { PlayerAccessRestricted } from "./player-access-restricted";
import { PlayerForm, type PlayerFormSubmitInput } from "./player-form";

export function PlayerEditScreen() {
  const { user, markSessionExpired } = useAuth();
  const role = user?.role;
  const allowed = canManagePlayers(role);
  const params = useParams();
  const rawId = params.id;
  const idValue = Array.isArray(rawId) ? rawId[0] : rawId;
  const id = Number(idValue);
  const hasValidId = Number.isInteger(id) && id > 0;

  const [player, setPlayer] = useState<PlayerDetailResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [loadedRequestKey, setLoadedRequestKey] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const requestKey = `${id}:${reloadKey}`;
  const isLoading = loadedRequestKey !== requestKey;

  useEffect(() => {
    if (!allowed || !hasValidId) {
      return;
    }

    const controller = new AbortController();
    let isActive = true;

    getPlayer(id, controller.signal)
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
          error instanceof Error
            ? error.message
            : "No se pudo cargar el perfil.",
        );
        setLoadedRequestKey(requestKey);
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [
    allowed,
    hasValidId,
    id,
    reloadKey,
    requestKey,
    markSessionExpired,
  ]);

  if (!allowed) {
    return (
      <PlayerAccessRestricted
        title="Editar jugador"
        message="Solo Administradores, directores y profesores de academia pueden editar perfiles deportivos."
      />
    );
  }

  if (!hasValidId) {
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
          title="No se pudo abrir la edición"
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
    input: PlayerFormSubmitInput,
  ): Promise<PlayerDetailResponse | undefined> {
    const result = await updatePlayer(id, input as PlayerUpdateInput);
    if (result) {
      setPlayer(result);
      setSuccessMessage("Los cambios se guardaron correctamente.");
    } else {
      setSuccessMessage("Los cambios se guardaron. La ficha se recargará.");
      setReloadKey((current) => current + 1);
    }
    return result;
  }

  const editable =
    player &&
    "birthDate" in player &&
    "version" in player &&
    (player.operationalStatus === "ACTIVE" || role === "ADMIN");

  return (
    <div>
      <header className="pageHeader">
        <div>
          <p className="eyebrow">JUGADORES</p>
          <h1>Editar jugador</h1>
          <p>
            Actualiza los datos del perfil deportivo. La academia, la cuenta, el
            tutor y los estados no se editan desde este formulario.
          </p>
        </div>
        <Link
          className="button buttonSecondary"
          href={playerDetailPath(id)}
        >
          Ver ficha
        </Link>
      </header>

      {successMessage ? (
        <Alert variant="success" title="Perfil actualizado">
          <p>{successMessage}</p>
        </Alert>
      ) : null}

      {isLoading ? (
        <InlineLoading message="Cargando perfil…" />
      ) : loadError || !player ? (
        <Alert variant="error" title="No se pudo cargar el perfil">
          <p>{loadError ?? "El perfil no está disponible."}</p>
          <button
            className="linkButton"
            type="button"
            onClick={() => setReloadKey((current) => current + 1)}
          >
            Reintentar
          </button>
        </Alert>
      ) : !editable ? (
        <StatePanel
          title="Perfil en solo lectura"
          action={
            <Link
              className="button buttonSecondary"
              href={playerDetailPath(player.id)}
            >
              Volver a la ficha
            </Link>
          }
        >
          <p>
            El perfil está inhabilitado y no admite edición. Un administrador
            puede reactivarlo desde la ficha antes de volver a editarlo.
          </p>
        </StatePanel>
      ) : (
        <section className="card">
          <h2 className="cardTitle">{playerFullName(player)}</h2>
          <p className="formSectionNote">
            Versión actual del perfil: {player.version}. Si otra operación lo
            modifica primero, los cambios se rechazarán para evitar
            sobrescribirla.
          </p>
          <PlayerForm
            mode="edit"
            initial={player}
            submitLabel="Guardar cambios"
            cancelHref={playerDetailPath(player.id)}
            onSubmit={handleSubmit}
          />
        </section>
      )}
    </div>
  );
}
