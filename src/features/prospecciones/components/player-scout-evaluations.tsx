"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { InlineLoading, StatePanel } from "@/components/ui/loading";
import { useAuth } from "@/features/auth/auth-provider";
import { ApiError, isAbortError } from "@/lib/api-client";
import type { ProspectResponse } from "@/types/api";
import { findProspectForPlayer } from "../prospects-api";
import { ProspectEvaluationList } from "./prospect-evaluation-list";
import { ScoutProspectAction } from "./scout-prospect-action";

/**
 * Evaluaciones privadas del ojeador autenticado para un jugador.
 *
 * Se monta únicamente desde la ficha cuando el rol es SCOUT. Las notas y
 * evaluaciones nunca se muestran a otros roles ni a otros ojeadores.
 */
export function PlayerScoutEvaluations({ playerId }: { playerId: number }) {
  const { user, markSessionExpired } = useAuth();
  const isScout = user?.role === "SCOUT";
  const [prospect, setProspect] = useState<ProspectResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [loadedRequestKey, setLoadedRequestKey] = useState<string | null>(null);

  const requestKey = `${playerId}:${reloadKey}`;
  const isLoading = loadedRequestKey !== requestKey;

  useEffect(() => {
    if (!isScout || playerId <= 0) {
      return;
    }

    const controller = new AbortController();
    let isActive = true;

    findProspectForPlayer(playerId, controller.signal)
      .then((result) => {
        if (isActive) {
          setProspect(result);
          setLoadError(null);
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

        setProspect(null);
        setLoadError(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar tus evaluaciones.",
        );
      })
      .finally(() => {
        if (isActive) {
          setLoadedRequestKey(requestKey);
        }
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [isScout, playerId, requestKey, markSessionExpired]);

  if (!isScout) {
    return null;
  }

  if (isLoading) {
    return (
      <section className="card sectionSpacer" aria-label="Evaluaciones privadas">
        <InlineLoading message="Cargando tus evaluaciones…" />
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="card sectionSpacer" aria-label="Evaluaciones privadas">
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
      </section>
    );
  }

  if (!prospect) {
    return (
      <section
        className="card sectionSpacer"
        aria-labelledby="player-scout-evaluations-title"
      >
        <h2 className="cardTitle" id="player-scout-evaluations-title">
          Evaluaciones de prospección
        </h2>
        <StatePanel
          title="Aún no sigues a este jugador"
          action={<ScoutProspectAction playerId={playerId} />}
        >
          <p>
            Inicia una prospección para registrar evaluaciones privadas. Solo tú
            podrás verlas; no se comparten con Admin, academia, club ni jugador.
          </p>
        </StatePanel>
      </section>
    );
  }

  return (
    <ProspectEvaluationList
      prospectId={prospect.id}
      status={prospect.status}
    />
  );
}
