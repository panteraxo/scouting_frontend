"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { InlineLoading } from "@/components/ui/loading";
import { TemporaryPasswordPanel } from "@/features/usuarios/components/temporary-password-panel";
import { useAuth } from "@/features/auth/auth-provider";
import { isAbortError } from "@/lib/api-client";
import type {
  PlayerAccountCreatedResponse,
  PlayerAccountCreateInput,
  PlayerDetailResponse,
} from "@/types/api";
import { canCreatePlayers } from "../access";
import { playerFullName } from "../catalogs";
import {
  createPlayerWithAccount,
  listPlayerAcademyOptions,
  type PlayerAcademyOption,
} from "../players-api";
import { playerDetailPath, PLAYERS_PATH } from "../routes";
import { PlayerAccessRestricted } from "./player-access-restricted";
import { PlayerForm, type PlayerFormSubmitInput } from "./player-form";

export function PlayerCreateScreen() {
  const { user, markSessionExpired } = useAuth();
  const role = user?.role;
  const allowed = canCreatePlayers(role);
  const isAdmin = role === "ADMIN";

  const [academies, setAcademies] = useState<PlayerAcademyOption[]>([]);
  const [academiesLoading, setAcademiesLoading] = useState(isAdmin);
  const [academiesError, setAcademiesError] = useState<string | null>(null);
  const [academiesReloadKey, setAcademiesReloadKey] = useState(0);
  const [created, setCreated] =
    useState<PlayerAccountCreatedResponse | null>(null);
  const [showPassword, setShowPassword] = useState(true);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (!allowed || !isAdmin) {
      return;
    }

    const controller = new AbortController();
    let isActive = true;

    listPlayerAcademyOptions("ADMIN", true, controller.signal)
      .then((data) => {
        if (!isActive) {
          return;
        }

        setAcademies(data);
        setAcademiesError(null);
      })
      .catch((error: unknown) => {
        if (!isActive || isAbortError(error)) {
          return;
        }

        setAcademies([]);
        setAcademiesError(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar las academias activas.",
        );
      })
      .finally(() => {
        if (isActive) {
          setAcademiesLoading(false);
        }
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [allowed, isAdmin, academiesReloadKey, markSessionExpired]);

  if (!allowed) {
    return (
      <PlayerAccessRestricted
        title="Nuevo jugador"
        message="Solo Administradores, directores y profesores de academia pueden registrar jugadores."
      />
    );
  }

  async function handleCreate(
    input: PlayerFormSubmitInput,
  ): Promise<PlayerDetailResponse | undefined> {
    const response = await createPlayerWithAccount(
      input as PlayerAccountCreateInput,
    );

    setCreated(response);
    setShowPassword(true);
    return response.player;
  }

  function handleCreateAnother() {
    setCreated(null);
    setShowPassword(true);
    setFormKey((current) => current + 1);
  }

  if (created) {
    return (
      <div>
        <header className="pageHeader">
          <div>
            <p className="eyebrow">JUGADORES</p>
            <h1>Jugador registrado</h1>
            <p>
              La cuenta y el perfil deportivo se crearon en una sola operación.
              Si el jugador es menor, el perfil quedará incompleto hasta que el
              staff registre al tutor.
            </p>
          </div>
        </header>

        <Alert variant="success" title="Cuenta y perfil creados">
          <p>
            <strong>{playerFullName(created.player)}</strong> fue registrado
            correctamente con rol Jugador. La cuenta deberá cambiar la contraseña
            temporal en su primer acceso.
          </p>
        </Alert>

        {showPassword ? (
          <TemporaryPasswordPanel
            title="Contraseña temporal del jugador"
            temporaryPassword={created.temporaryPassword}
            temporaryPasswordExpiresAt={
              created.temporaryPasswordExpiresAt
            }
            onDismiss={() => setShowPassword(false)}
          />
        ) : (
          <p className="footnote">
            La contraseña temporal ya no se muestra. Si no se copió, un
            administrador debe restablecerla desde el módulo Usuarios.
          </p>
        )}

        <div className="formActions sectionSpacer">
          <Link
            className="button buttonPrimary"
            href={playerDetailPath(created.player.id)}
          >
            Ver ficha
          </Link>
          <Link className="button buttonSecondary" href={PLAYERS_PATH}>
            Ir al listado
          </Link>
          <button
            className="button buttonGhost"
            type="button"
            onClick={handleCreateAnother}
          >
            Crear otro jugador
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <header className="pageHeader">
        <div>
          <p className="eyebrow">JUGADORES</p>
          <h1>Nuevo jugador</h1>
          <p>
            Crea la cuenta del jugador y completa su perfil deportivo. La cuenta
            recibirá una contraseña temporal.
          </p>
        </div>
        <Link className="button buttonSecondary" href={PLAYERS_PATH}>
          Volver al listado
        </Link>
      </header>

      {isAdmin && academiesLoading ? (
        <div className="card">
          <InlineLoading message="Cargando academias activas…" />
        </div>
      ) : null}

      {isAdmin && academiesError ? (
        <Alert variant="error" title="No se pudieron cargar las academias">
          <p>{academiesError}</p>
          <button
            className="linkButton"
            type="button"
            onClick={() => {
              setAcademiesLoading(true);
              setAcademiesReloadKey((current) => current + 1);
            }}
          >
            Reintentar
          </button>
        </Alert>
      ) : null}

      <section className="card">
        <PlayerForm
          key={formKey}
          mode="create-account"
          academyOptions={isAdmin ? academies : undefined}
          academyRequired={isAdmin}
          academyError={isAdmin ? academiesError : undefined}
          submitLabel="Crear jugador"
          cancelHref={PLAYERS_PATH}
          onSubmit={handleCreate}
        />
      </section>
    </div>
  );
}
