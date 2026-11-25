"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { InlineLoading } from "@/components/ui/loading";
import { useAuth } from "@/features/auth/auth-provider";
import { documentTypeLabel } from "@/features/auth/user-labels";
import {
  CONSENT_STATUS_LABELS,
  formatDateTime,
} from "@/features/jugadores/catalogs";
import { getPlayerGuardian } from "@/features/jugadores/players-api";
import { ApiError, isAbortError } from "@/lib/api-client";
import type {
  PlayerGuardianStaffResponse,
  PlayerGuardianScoutResponse,
} from "@/types/api";

type GuardianState =
  | { status: "loading" }
  | { status: "ready"; guardian: PlayerGuardianStaffResponse | PlayerGuardianScoutResponse }
  | { status: "missing" }
  | { status: "forbidden" }
  | { status: "error"; message: string };

/**
 * Datos del tutor dentro de la ficha del jugador en prospección. El backend solo
 * los expone al ojeador cuando el jugador es menor de edad y tiene tutor
 * registrado; en el resto de casos se informa sin exponer nada.
 */
export function ProspectGuardianCard({
  playerId,
  playerAge,
}: {
  playerId: number;
  playerAge: number | null;
}) {
  const { markSessionExpired } = useAuth();
  const isAdult = playerAge !== null && playerAge >= 18;
  const [state, setState] = useState<GuardianState>(
    isAdult ? { status: "missing" } : { status: "loading" },
  );
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (isAdult) {
      return;
    }

    const controller = new AbortController();
    let isActive = true;

    getPlayerGuardian(playerId, controller.signal)
      .then((data) => {
        if (!isActive) {
          return;
        }

        // El backend devuelve la variante de staff u ojeador según el rol; aquí
        // el ojeador siempre recibe la variante acotada.
        setState({
          status: "ready",
          guardian: data,
        });
      })
      .catch((error: unknown) => {
        if (!isActive || isAbortError(error)) {
          return;
        }

        if (error instanceof ApiError && error.status === 401) {
          markSessionExpired();
          return;
        }

        if (error instanceof ApiError && error.status === 404) {
          setState({ status: "missing" });
          return;
        }

        if (error instanceof ApiError && error.status === 403) {
          setState({ status: "forbidden" });
          return;
        }

        setState({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "No se pudieron cargar los datos del tutor.",
        });
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [isAdult, playerId, reloadKey, markSessionExpired]);

  if (isAdult) {
    return null;
  }

  return (
    <section className="card sectionSpacer" aria-labelledby="prospect-guardian">
      <h2 className="cardTitle" id="prospect-guardian">
        Datos del tutor
      </h2>

      {state.status === "loading" ? (
        <InlineLoading message="Cargando datos del tutor…" />
      ) : state.status === "ready" ? (
        <>
          {state.guardian.consent.status === "DENIED" ||
          state.guardian.consent.status === "REVOKED" ? (
            <Alert variant="warning" title="Consentimiento no vigente">
              <p>
                El tutor no autorizó el tratamiento de los datos del jugador.
                Usa esta información solo para el seguimiento y no la compartas
                fuera del proceso.
              </p>
            </Alert>
          ) : null}

          <dl className="metaList">
            <div>
              <dt>Nombre</dt>
              <dd>
                {state.guardian.firstName} {state.guardian.lastName}
              </dd>
            </div>
            <div>
              <dt>Documento</dt>
              <dd>
                {documentTypeLabel(state.guardian.documentType)}{" "}
                {state.guardian.documentNumber}
              </dd>
            </div>
            <div>
              <dt>Teléfono</dt>
              <dd>{state.guardian.phone}</dd>
            </div>
            <div>
              <dt>Dirección</dt>
              <dd>{state.guardian.address}</dd>
            </div>
            <div>
              <dt>Parentesco</dt>
              <dd>{state.guardian.relationship}</dd>
            </div>
            <div>
              <dt>Consentimiento</dt>
              <dd>
                {CONSENT_STATUS_LABELS[state.guardian.consent.status] ?? "—"}
              </dd>
            </div>
            <div>
              <dt>Registrado</dt>
              <dd>{formatDateTime(state.guardian.consent.recordedAt)}</dd>
            </div>
          </dl>

          <p className="footnote">
            Datos restringidos del tutor. Solo se muestran al ojeador autor del
            seguimiento y no forman parte del resumen deportivo del jugador.
          </p>
        </>
      ) : state.status === "missing" ? (
        <p className="formSectionNote">
          {playerAge === null
            ? "No hay datos de tutor disponibles para este jugador."
            : "El jugador es menor de edad y todavía no tiene tutor registrado. El personal de la academia puede completarlo desde la ficha del jugador."}
        </p>
      ) : state.status === "forbidden" ? (
        <p className="formSectionNote">
          Tu cuenta no tiene permisos para consultar los datos del tutor de este
          jugador.
        </p>
      ) : (
        <Alert variant="error" title="No se pudieron cargar los datos del tutor">
          <p>{state.message}</p>
          <button
            className="linkButton"
            type="button"
            onClick={() => {
              setState({ status: "loading" });
              setReloadKey((current) => current + 1);
            }}
          >
            Reintentar
          </button>
        </Alert>
      )}
    </section>
  );
}
