"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { TextAreaField } from "@/components/ui/form-field";
import { InlineLoading, Spinner, StatePanel } from "@/components/ui/loading";
import { useAuth } from "@/features/auth/auth-provider";
import { ApiError, isAbortError } from "@/lib/api-client";
import { getPlayer } from "@/features/jugadores/players-api";
import { playerDetailPath, PLAYERS_PATH } from "@/features/jugadores/routes";
import type {
  PlayerDetailResponse,
  ProspectPlayerSummary,
  ProspectResponse,
} from "@/types/api";
import { canUseProspects } from "../access";
import { prospectPlayerName } from "../catalogs";
import {
  createProspect,
  findProspectForPlayer,
} from "../prospects-api";
import { prospectDetailPath, PROSPECTS_PATH } from "../routes";
import { ProspectAccessRestricted } from "./prospect-access-restricted";
import { ProspectPlayerSummaryCard } from "./prospect-player-summary-card";

export function ProspectCreateScreen() {
  const { user, markSessionExpired } = useAuth();
  const allowed = canUseProspects(user?.role);
  const searchParams = useSearchParams();
  const rawPlayerId = Number(searchParams.get("playerId"));
  const playerId =
    Number.isInteger(rawPlayerId) && rawPlayerId > 0 ? rawPlayerId : null;

  const [player, setPlayer] = useState<PlayerDetailResponse | null>(null);
  const [existing, setExisting] = useState<ProspectResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [existingLookupFailed, setExistingLookupFailed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [created, setCreated] = useState<ProspectResponse | null>(null);

  useEffect(() => {
    if (!allowed || !playerId) {
      return;
    }

    const controller = new AbortController();
    let isActive = true;

    Promise.all([
      getPlayer(playerId, controller.signal),
      findProspectForPlayer(playerId, controller.signal),
    ])
      .then(([playerData, existingProspect]) => {
        if (!isActive) {
          return;
        }

        setPlayer(playerData);
        setExisting(existingProspect);
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
        setExisting(null);
        setLoadError(
          error instanceof ApiError && error.status === 404
            ? "El jugador no existe o ya no es elegible para prospección."
            : error instanceof Error
              ? error.message
              : "No se pudo cargar el jugador.",
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
  }, [allowed, playerId, markSessionExpired]);

  if (!allowed) {
    return (
      <ProspectAccessRestricted
        title="Nueva prospección"
        message="Solo un ojeador puede crear prospecciones."
      />
    );
  }

  if (!playerId) {
    return (
      <div>
        <header className="pageHeader">
          <div>
            <p className="eyebrow">MI PROSPECCIÓN</p>
            <h1>Nueva prospección</h1>
            <p>
              Abre esta página desde la ficha de un jugador elegible para iniciar
              el seguimiento.
            </p>
          </div>
        </header>
        <StatePanel
          title="Falta el jugador"
          action={
            <Link className="button buttonPrimary" href={PLAYERS_PATH}>
              Buscar jugadores
            </Link>
          }
        >
          <p>
            La prospección se crea desde la ficha de un jugador activo, completo
            y con academia operativa.
          </p>
        </StatePanel>
      </div>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    if (notes.trim().length > 2000) {
      setFormError("Las notas privadas no deben superar 2000 caracteres.");
      return;
    }

    setFormError(null);
    setExistingLookupFailed(false);
    setIsSubmitting(true);

    try {
      const result = await createProspect({
        playerId: playerId as number,
        privateNotes: notes.trim() || null,
      });

      if (result) {
        setCreated(result);
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        markSessionExpired();
        return;
      }

      if (
        error instanceof ApiError &&
        error.code === "PROSPECT_ALREADY_EXISTS"
      ) {
        const existingProspect = await findProspectForPlayer(
          playerId as number,
        ).catch(() => null);
        setExisting(existingProspect);
        if (existingProspect) {
          setFormError(
            "Ya existe una prospección propia para este jugador. Usa el enlace para abrirla.",
          );
        } else {
          setExistingLookupFailed(true);
          setFormError(
            "Ya existe una prospección propia, pero no se pudo cargar el enlace. Abre la lista de prospecciones para encontrarla.",
          );
        }
      } else {
        setFormError(
          error instanceof Error
            ? error.message
            : "No se pudo crear la prospección.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const summary: ProspectPlayerSummary | null = player
    ? {
        id: player.id,
        firstName: player.firstName,
        lastName: player.lastName,
        age: player.age,
        position: player.position,
        positionGroup: player.positionGroup,
        academy: player.academy,
      }
    : null;

  if (created) {
    return (
      <div>
        <header className="pageHeader">
          <div>
            <p className="eyebrow">MI PROSPECCIÓN</p>
            <h1>Prospección creada</h1>
            <p>El seguimiento privado quedó registrado.</p>
          </div>
        </header>
        <Alert variant="success" title="Prospección creada">
          <p>
            Ahora sigues a{" "}
            <strong>{prospectPlayerName(created.player)}</strong>. Solo tú puedes
            ver sus notas y evaluaciones.
          </p>
        </Alert>
        <div className="formActions">
          <Link
            className="button buttonPrimary"
            href={prospectDetailPath(created.id)}
          >
            Ver prospección
          </Link>
          <Link className="button buttonSecondary" href={PLAYERS_PATH}>
            Seguir buscando jugadores
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <header className="pageHeader">
        <div>
          <p className="eyebrow">MI PROSPECCIÓN</p>
          <h1>Nueva prospección</h1>
          <p>
            La prospección es privada y pertenece a tu cuenta. No se muestran
            datos de tutor, residencia detallada ni PII de la cuenta del jugador.
          </p>
        </div>
        <Link
          className="button buttonSecondary"
          href={playerDetailPath(playerId)}
        >
          Volver a la ficha
        </Link>
      </header>

      {isLoading ? (
        <InlineLoading message="Cargando jugador…" />
      ) : loadError || !summary ? (
        <Alert variant="error" title="No se pudo iniciar la prospección">
          <p>{loadError ?? "El jugador no está disponible."}</p>
          <Link className="button buttonSecondary buttonSmall cardAction" href={PLAYERS_PATH}>
            Volver a jugadores
          </Link>
        </Alert>
      ) : (
        <>
          <ProspectPlayerSummaryCard player={summary} />

          {existing ? (
            <Alert variant="warning" title="Ya sigues a este jugador">
              <p>
                Ya existe una prospección propia para {prospectPlayerName(summary)}.
                No se puede crear otra.
              </p>
              <Link
                className="button buttonPrimary buttonSmall cardAction"
                href={prospectDetailPath(existing.id)}
              >
                Abrir prospección existente
              </Link>
            </Alert>
          ) : (
            <section className="card sectionSpacer" aria-labelledby="prospect-create-form">
              <h2 className="cardTitle" id="prospect-create-form">
                Datos del seguimiento
              </h2>
              <form className="form" onSubmit={handleSubmit} noValidate>
                <TextAreaField
                  label="Notas privadas (opcional)"
                  name="privateNotes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  error={formError ?? undefined}
                  maxLength={2000}
                  rows={4}
                  hint="Máximo 2000 caracteres. Solo tú puedes ver estas notas."
                  disabled={isSubmitting}
                />
                <div className="formActions">
                  <button
                    className="button buttonPrimary"
                    type="submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <Spinner /> : null}
                    {isSubmitting ? "Creando…" : "Crear prospección"}
                  </button>
                  <Link
                    className="button buttonSecondary"
                    href={playerDetailPath(playerId)}
                  >
                    Cancelar
                  </Link>
                </div>
              </form>
              {existingLookupFailed ? (
                <p className="footnote">
                  No se pudo recuperar el enlace directo.{" "}
                  <Link href={PROSPECTS_PATH}>Ir a mis prospecciones</Link> para
                  abrir la existente.
                </p>
              ) : null}
            </section>
          )}
        </>
      )}
    </div>
  );
}
