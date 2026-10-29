"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { TextAreaField } from "@/components/ui/form-field";
import { InlineLoading, Spinner, StatePanel } from "@/components/ui/loading";
import { useAuth } from "@/features/auth/auth-provider";
import { ConfirmDialog } from "@/features/organizations/components/confirm-dialog";
import { ApiError, isAbortError } from "@/lib/api-client";
import type { ProspectResponse, ProspectStatus } from "@/types/api";
import { canUseProspects } from "../access";
import {
  allowedStatusTransitions,
  formatProspectDateTime,
  prospectStatusBadgeClass,
  prospectStatusLabel,
  statusActionLabel,
  statusConfirmDescription,
} from "../catalogs";
import {
  getProspect,
  updateProspectNotes,
  updateProspectStatus,
} from "../prospects-api";
import { PROSPECTS_PATH } from "../routes";
import { ProspectAccessRestricted } from "./prospect-access-restricted";
import { ProspectEvaluationList } from "./prospect-evaluation-list";
import { ProspectPlayerSummaryCard } from "./prospect-player-summary-card";
import { ProspectRecommendationList } from "@/features/recomendaciones/components/prospect-recommendation-list";

export function ProspectDetailScreen() {
  const { user, markSessionExpired } = useAuth();
  const allowed = canUseProspects(user?.role);
  const params = useParams();
  const rawId = params.id;
  const idValue = Array.isArray(rawId) ? rawId[0] : rawId;
  const id = Number(idValue);
  const hasValidId = Number.isInteger(id) && id > 0;

  const [prospect, setProspect] = useState<ProspectResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [notes, setNotes] = useState("");
  const [notesError, setNotesError] = useState<string | null>(null);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<ProspectStatus | null>(
    null,
  );
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [staleError, setStaleError] = useState(false);

  useEffect(() => {
    if (!allowed || !hasValidId) {
      return;
    }

    const controller = new AbortController();
    let isActive = true;

    getProspect(id, controller.signal)
      .then((data) => {
        if (!isActive) {
          return;
        }

        setProspect(data);
        setNotes(data.privateNotes ?? "");
        setLoadError(null);
        setStaleError(false);
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
          error instanceof ApiError && error.status === 404
            ? "La prospección no existe o pertenece a otro ojeador."
            : error instanceof Error
              ? error.message
              : "No se pudo cargar la prospección.",
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
  }, [allowed, hasValidId, id, reloadKey, markSessionExpired]);

  if (!allowed) {
    return (
      <ProspectAccessRestricted
        title="Prospección"
        message="Solo el ojeador autor puede consultar esta prospección y sus evaluaciones."
      />
    );
  }

  if (!hasValidId) {
    return (
      <div>
        <header className="pageHeader">
          <div>
            <p className="eyebrow">MI PROSPECCIÓN</p>
            <h1>Prospección no válida</h1>
            <p>La dirección de esta página no es válida.</p>
          </div>
        </header>
        <StatePanel
          title="No se pudo abrir la prospección"
          action={
            <Link className="button buttonSecondary" href={PROSPECTS_PATH}>
              Volver a prospecciones
            </Link>
          }
        >
          <p>Verifica el enlace o regresa al listado.</p>
        </StatePanel>
      </div>
    );
  }

  async function handleSaveNotes(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!prospect || isSavingNotes) {
      return;
    }

    setNotesError(null);
    setSuccessMessage(null);

    if (notes.trim().length > 2000) {
      setNotesError("Las notas privadas no deben superar 2000 caracteres.");
      return;
    }

    setIsSavingNotes(true);

    try {
      const updated = await updateProspectNotes(prospect.id, {
        privateNotes: notes.trim() || null,
        version: prospect.version,
      });

      if (updated) {
        setProspect(updated);
        setNotes(updated.privateNotes ?? "");
        setSuccessMessage("Las notas privadas se guardaron.");
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        markSessionExpired();
        return;
      }

      setNotesError(
        error instanceof ApiError && error.code === "STALE_PROSPECT"
          ? "La prospección fue modificada por otra operación. Recarga la ficha antes de guardar."
          : error instanceof Error
            ? error.message
            : "No se pudieron guardar las notas.",
      );
      if (error instanceof ApiError && error.code === "STALE_PROSPECT") {
        setStaleError(true);
      }
    } finally {
      setIsSavingNotes(false);
    }
  }

  async function handleStatusChange() {
    if (!prospect || !pendingStatus || isChangingStatus) {
      return;
    }

    setIsChangingStatus(true);
    setStatusError(null);
    setSuccessMessage(null);

    try {
      const updated = await updateProspectStatus(prospect.id, {
        status: pendingStatus,
        version: prospect.version,
      });

      if (updated) {
        setProspect(updated);
        setNotes(updated.privateNotes ?? "");
        setSuccessMessage(
          `Estado actualizado a ${prospectStatusLabel(updated.status)}.`,
        );
      }

      setPendingStatus(null);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        markSessionExpired();
        return;
      }

      setStatusError(
        error instanceof ApiError && error.code === "STALE_PROSPECT"
          ? "La prospección fue modificada por otra operación. Recarga la ficha."
          : error instanceof Error
            ? error.message
            : "No se pudo cambiar el estado.",
      );
      if (error instanceof ApiError && error.code === "STALE_PROSPECT") {
        setStaleError(true);
        setPendingStatus(null);
      }
    } finally {
      setIsChangingStatus(false);
    }
  }

  const transitions = prospect ? allowedStatusTransitions(prospect.status) : [];

  return (
    <div>
      <header className="pageHeader">
        <div>
          <p className="eyebrow">MI PROSPECCIÓN</p>
          <h1>Detalle de prospección</h1>
          <p>
            Seguimiento privado. Solo tú puedes ver las notas, evaluaciones y
            datos de este jugador en este módulo.
          </p>
        </div>
        <Link className="button buttonSecondary" href={PROSPECTS_PATH}>
          Volver a prospecciones
        </Link>
      </header>

      {successMessage ? (
        <Alert variant="success" title="Prospección actualizada">
          <p>{successMessage}</p>
        </Alert>
      ) : null}

      {staleError ? (
        <Alert variant="warning" title="La prospección cambió">
          <p>
            Otra operación modificó la prospección y la versión local quedó
            desactualizada. Recarga la ficha para continuar con los datos
            actuales.
          </p>
          <button
            className="linkButton"
            type="button"
            onClick={() => {
              setStaleError(false);
              setIsLoading(true);
              setReloadKey((current) => current + 1);
            }}
          >
            Recargar prospección
          </button>
        </Alert>
      ) : null}

      {isLoading ? (
        <InlineLoading message="Cargando prospección…" />
      ) : loadError || !prospect ? (
        <Alert variant="error" title="No se pudo cargar la prospección">
          <p>{loadError ?? "La prospección no está disponible."}</p>
          <button
            className="linkButton"
            type="button"
            onClick={() => {
              setIsLoading(true);
              setReloadKey((current) => current + 1);
            }}
          >
            Reintentar
          </button>
          <Link className="button buttonSecondary buttonSmall cardAction" href={PROSPECTS_PATH}>
            Volver a prospecciones
          </Link>
        </Alert>
      ) : (
        <>
          <ProspectPlayerSummaryCard player={prospect.player} />

          <section className="card sectionSpacer" aria-labelledby="prospect-status">
            <div className="tableHeader">
              <div>
                <h2 className="cardTitle" id="prospect-status">
                  Estado del seguimiento
                </h2>
                <p className="tableCount">
                  Iniciada: {formatProspectDateTime(prospect.startedAt)} ·
                  Última actividad: {formatProspectDateTime(prospect.lastActivityAt)}
                </p>
              </div>
              <span className={prospectStatusBadgeClass(prospect.status)}>
                {prospectStatusLabel(prospect.status)}
              </span>
            </div>

            <dl className="metaList">
              <div>
                <dt>Cierre</dt>
                <dd>
                  {prospect.closedAt
                    ? formatProspectDateTime(prospect.closedAt)
                    : "—"}
                </dd>
              </div>
              <div>
                <dt>Versión</dt>
                <dd>{prospect.version}</dd>
              </div>
            </dl>

            <div className="formActions sectionSpacer">
              {transitions.map((target) => (
                <button
                  key={target}
                  className={
                    target === "CLOSED"
                      ? "button buttonDanger"
                      : "button buttonSecondary"
                  }
                  type="button"
                  onClick={() => {
                    setStatusError(null);
                    setPendingStatus(target);
                  }}
                  disabled={isChangingStatus}
                >
                  {statusActionLabel(prospect.status, target)}
                </button>
              ))}
            </div>
          </section>

          <section className="card sectionSpacer" aria-labelledby="prospect-notes">
            <h2 className="cardTitle" id="prospect-notes">
              Notas privadas
            </h2>
            <p className="formSectionNote">
              Solo tú puedes ver estas notas. No se comparten con Admin, academia,
              club ni jugador.
            </p>
            <form className="form" onSubmit={handleSaveNotes} noValidate>
              <TextAreaField
                label="Notas privadas"
                name="privateNotes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                error={notesError ?? undefined}
                maxLength={2000}
                rows={5}
                hint="Opcional. Máximo 2000 caracteres. Usa la versión actual para evitar conflictos."
                disabled={isSavingNotes}
              />
              <div className="formActions">
                <button
                  className="button buttonPrimary"
                  type="submit"
                  disabled={isSavingNotes}
                >
                  {isSavingNotes ? <Spinner /> : null}
                  {isSavingNotes ? "Guardando…" : "Guardar notas"}
                </button>
                <button
                  className="button buttonSecondary"
                  type="button"
                  onClick={() => {
                    setNotes(prospect.privateNotes ?? "");
                    setNotesError(null);
                  }}
                  disabled={isSavingNotes}
                >
                  Descartar cambios
                </button>
              </div>
            </form>
          </section>

          <ProspectEvaluationList
            prospectId={prospect.id}
            status={prospect.status}
          />

          <ProspectRecommendationList prospectId={prospect.id} />
        </>
      )}

      {pendingStatus && prospect ? (
        <ConfirmDialog
          title={`${statusActionLabel(prospect.status, pendingStatus)} prospección`}
          description={statusConfirmDescription(
            prospect.status,
            pendingStatus,
          )}
          confirmLabel={`Confirmar ${statusActionLabel(
            prospect.status,
            pendingStatus,
          ).toLowerCase()}`}
          variant={pendingStatus === "CLOSED" ? "danger" : "primary"}
          isProcessing={isChangingStatus}
          error={statusError}
          details={
            <>
              <strong>{prospect.player.firstName} {prospect.player.lastName}</strong>
              <span>
                Estado actual: {prospectStatusLabel(prospect.status)} · Versión{" "}
                {prospect.version}
              </span>
            </>
          }
          onCancel={() => {
            setPendingStatus(null);
            setStatusError(null);
          }}
          onConfirm={handleStatusChange}
        />
      ) : null}
    </div>
  );
}
