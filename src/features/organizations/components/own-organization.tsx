"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { InlineLoading } from "@/components/ui/loading";
import { useAuth } from "@/features/auth/auth-provider";
import { ApiError, isAbortError } from "@/lib/api-client";
import type {
  OrganizationKind,
  OrganizationResponse,
} from "@/types/api";
import { kindNoun, kindThe } from "../labels";
import {
  deactivateOwnOrganization,
  getOwnOrganization,
} from "../organizations-api";
import { ownEditPath } from "../routes";
import { ConfirmDialog } from "./confirm-dialog";
import { OrganizationAccessRestricted } from "./organization-access-restricted";
import { OrganizationDetail } from "./organization-detail";

export function OwnOrganization({ kind }: { kind: OrganizationKind }) {
  const { user, markSessionExpired } = useAuth();
  const role = user?.role;
  const hasAccess =
    kind === "academy"
      ? role === "PROFESSOR" || role === "ACADEMY_DIRECTOR"
      : role === "CLUB_MANAGER";
  const canManage =
    kind === "academy" ? role === "ACADEMY_DIRECTOR" : role === "CLUB_MANAGER";

  const [organization, setOrganization] =
    useState<OrganizationResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [loadedRequestKey, setLoadedRequestKey] = useState<string | null>(
    null,
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const requestKey = `${kind}:${reloadKey}`;
  const isLoading = loadedRequestKey !== requestKey;

  useEffect(() => {
    if (!hasAccess) {
      return;
    }

    const controller = new AbortController();
    let isActive = true;

    getOwnOrganization(kind, controller.signal)
      .then((data) => {
        if (!isActive) {
          return;
        }

        setOrganization(data);
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

        setOrganization(null);
        setLoadError(
          error instanceof ApiError && error.status === 404
            ? `No tienes ${kind === "academy" ? "una academia" : "un club"} asignado. Contacta a un administrador.`
            : error instanceof Error
              ? error.message
              : `No se pudo cargar tu ${kindNoun(kind)}.`,
        );
        setLoadedRequestKey(requestKey);
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [
    hasAccess,
    kind,
    reloadKey,
    requestKey,
    markSessionExpired,
  ]);

  if (!hasAccess) {
    return (
      <OrganizationAccessRestricted
        title={kind === "academy" ? "Mi academia" : "Mi club"}
        message={
          kind === "academy"
            ? "Este módulo está disponible para Profesores y Directores de academia."
            : "Este módulo está disponible para Responsables de club."
        }
      />
    );
  }

  async function handleDeactivate() {
    if (isProcessing) {
      return;
    }

    setIsProcessing(true);
    setModalError(null);
    setSuccessMessage(null);

    try {
      const updated = await deactivateOwnOrganization(kind);
      setShowDeactivate(false);
      setSuccessMessage(
        `${kindThe(kind)} quedó en estado inhabilitado y en solo lectura. Contacta a un administrador para solicitar la reactivación.`,
      );

      if (updated) {
        setOrganization(updated);
      } else {
        setReloadKey((current) => current + 1);
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setShowDeactivate(false);
        markSessionExpired();
        return;
      }

      setModalError(
        error instanceof Error
          ? error.message
          : "No se pudo inhabilitar la organización.",
      );
    } finally {
      setIsProcessing(false);
    }
  }

  const title = kind === "academy" ? "Mi academia" : "Mi club";

  return (
    <div>
      <header className="pageHeader">
        <div>
          <p className="eyebrow">MI ORGANIZACIÓN</p>
          <h1>{title}</h1>
          <p>
            {canManage
              ? `Consulta y actualiza los datos de tu ${kindNoun(kind)}.`
              : `Consulta la información de tu ${kindNoun(kind)}. Tu rol tiene acceso de solo lectura.`}
          </p>
        </div>
        {organization?.operationalStatus === "ACTIVE" && canManage ? (
          <div className="toolbarActions">
            <Link
              className="button buttonPrimary"
              href={ownEditPath(kind)}
            >
              Editar
            </Link>
            <button
              className="button buttonDanger"
              type="button"
              onClick={() => {
                setModalError(null);
                setShowDeactivate(true);
              }}
              disabled={isProcessing}
            >
              Inhabilitar
            </button>
          </div>
        ) : null}
      </header>

      {successMessage ? (
        <Alert variant="success" title="Organización actualizada">
          <p>{successMessage}</p>
        </Alert>
      ) : null}

      {isLoading ? (
        <InlineLoading message={`Cargando tu ${kindNoun(kind)}…`} />
      ) : loadError || !organization ? (
        <Alert variant="error" title="No se pudo cargar la organización">
          <p>{loadError ?? "La organización no está disponible."}</p>
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
          {organization.operationalStatus === "INACTIVE" ? (
            <Alert variant="warning" title="Organización inhabilitada">
              <p>
                {kind === "academy"
                  ? "Esta academia está inhabilitada y se muestra en solo lectura."
                  : "Este club está inhabilitado y se muestra en solo lectura."}{" "}
                Contacta a un administrador para solicitar la reactivación; tu
                cuenta no puede reactivarla.
              </p>
            </Alert>
          ) : null}

          {!canManage ? (
            <Alert variant="info" title="Solo lectura">
              <p>
                Tu rol permite consultar esta organización, pero no editarla ni
                inhabilitarla. 
              </p>
            </Alert>
          ) : null}

          <OrganizationDetail
            kind={kind}
            organization={organization}
            showAdministrativeData
          />

          {kind === "club" && role === "CLUB_MANAGER" ? (
            <section
              className="card sectionSpacer"
              aria-labelledby="club-recommendations-link"
            >
              <h2 className="cardTitle" id="club-recommendations-link">
                Recomendaciones del club
              </h2>
              <p>
                Revisa las recomendaciones dirigidas a tu club y registra
                respuestas. Las respuestas no se editan ni eliminan. No se
                muestran notas privadas del ojeador.
              </p>
              <Link
                className="button buttonPrimary cardAction"
                href="/mi-club/recomendaciones"
              >
                Abrir bandeja de recomendaciones
              </Link>
            </section>
          ) : null}
        </>
      )}

      {showDeactivate && organization ? (
        <ConfirmDialog
          title={`Inhabilitar ${kindNoun(kind)}`}
          description={`${kindThe(kind)} quedará en solo lectura. No se desactivan cuentas ni se eliminan relaciones. Solo un administrador puede reactivar la organización.`}
          confirmLabel="Confirmar inhabilitación"
          variant="danger"
          isProcessing={isProcessing}
          error={modalError}
          details={
            <>
              <strong>{organization.name}</strong>
              <span>{organization.code}</span>
            </>
          }
          onCancel={() => {
            setShowDeactivate(false);
            setModalError(null);
          }}
          onConfirm={handleDeactivate}
        />
      ) : null}

      <p className="footnote">
        Organización asignada a tu cuenta. Si no corresponde, contacta a un
        administrador. No puedes reactivar ni cambiar la verificación.
      </p>
    </div>
  );
}
