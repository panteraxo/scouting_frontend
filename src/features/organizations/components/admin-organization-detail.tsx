"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { InlineLoading, StatePanel } from "@/components/ui/loading";
import { useAuth } from "@/features/auth/auth-provider";
import { ApiError, isAbortError } from "@/lib/api-client";
import type {
  OrganizationKind,
  OrganizationResponse,
  VerificationAction,
  VerificationTargetStatus,
} from "@/types/api";
import {
  changeOrganizationVerification,
  getAdminOrganization,
  setAdminOrganizationActive,
} from "../organizations-api";
import {
  kindNoun,
  kindPlural,
  kindThe,
  operationalStatusLabel,
  verificationLabel,
} from "../labels";
import { adminEditPath, ADMIN_ORGANIZATION_PATH } from "../routes";
import { ConfirmDialog } from "./confirm-dialog";
import { OrganizationAccessRestricted } from "./organization-access-restricted";
import { OrganizationDetail } from "./organization-detail";

type PendingAction =
  | { type: "deactivate" }
  | { type: "reactivate" }
  | { type: "verification"; action: VerificationAction };

const VERIFICATION_TARGET: Record<
  VerificationAction,
  VerificationTargetStatus
> = {
  VERIFY: "VERIFIED",
  REJECT: "REJECTED",
  REOPEN: "PENDING_VERIFICATION",
  REVOKE: "PENDING_VERIFICATION",
};

function actionDialogCopy(
  kind: OrganizationKind,
  pending: PendingAction,
): { title: string; description: string; confirmLabel: string; danger: boolean } {
  if (pending.type === "deactivate") {
    return {
      title: `Inhabilitar ${kindNoun(kind)}`,
      description: `${kindThe(kind)} quedará en solo lectura para sus usuarios asignados. No se desactivan cuentas ni se eliminan relaciones.`,
      confirmLabel: "Confirmar inhabilitación",
      danger: true,
    };
  }

  if (pending.type === "reactivate") {
    return {
      title: `Reactivar ${kindNoun(kind)}`,
      description: `${kindThe(kind)} volverá a estar activa. Solo el Administrador puede reactivar la organización.`,
      confirmLabel: "Confirmar reactivación",
      danger: false,
    };
  }

  if (pending.action === "VERIFY") {
    return {
      title: "Verificar organización",
      description:
        "La organización quedará verificada y podrá mostrarse a los ojeadores si además está activa.",
      confirmLabel: "Confirmar verificación",
      danger: false,
    };
  }

  if (pending.action === "REJECT") {
    return {
      title: "Rechazar organización",
      description:
        "La organización quedará rechazada y no se mostrará a los ojeadores.",
      confirmLabel: "Confirmar rechazo",
      danger: true,
    };
  }

  if (pending.action === "REVOKE") {
    return {
      title: "Revocar verificación",
      description:
        "La organización dejará de estar verificada y no se mostrará a los ojeadores.",
      confirmLabel: "Confirmar revocación",
      danger: true,
    };
  }

  return {
    title: "Reabrir verificación",
    description:
      "La organización volverá a quedar pendiente de revisión por el Administrador.",
    confirmLabel: "Confirmar reapertura",
    danger: false,
  };
}

export function AdminOrganizationDetail({
  kind,
}: {
  kind: OrganizationKind;
}) {
  const { user, markSessionExpired } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const params = useParams();
  const rawId = params.id;
  const idValue = Array.isArray(rawId) ? rawId[0] : rawId;
  const id = Number(idValue);
  const hasValidId = Number.isInteger(id) && id > 0;

  const [organization, setOrganization] =
    useState<OrganizationResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [loadedRequestKey, setLoadedRequestKey] = useState<string | null>(
    null,
  );
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null,
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const requestKey = `${kind}:${id}:${reloadKey}`;
  const isLoading = loadedRequestKey !== requestKey;

  useEffect(() => {
    if (!isAdmin || !hasValidId) {
      return;
    }

    const controller = new AbortController();
    let isActive = true;

    getAdminOrganization(kind, id, controller.signal)
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
          error instanceof Error
            ? error.message
            : "No se pudo cargar la organización.",
        );
        setLoadedRequestKey(requestKey);
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [
    isAdmin,
    hasValidId,
    kind,
    id,
    reloadKey,
    requestKey,
    markSessionExpired,
  ]);

  if (!isAdmin) {
    return (
      <OrganizationAccessRestricted
        title={`Detalle de ${kindNoun(kind)}`}
        message={`Solo un administrador puede consultar y administrar ${kindPlural(kind)}.`}
      />
    );
  }

  if (!hasValidId) {
    return (
      <div>
        <header className="pageHeader">
          <div>
            <p className="eyebrow">ADMINISTRACIÓN</p>
            <h1>Organización no válida</h1>
            <p>La dirección de esta página no es válida.</p>
          </div>
        </header>
        <StatePanel
          title="No se pudo abrir el detalle"
          action={
            <Link
              className="button buttonSecondary"
              href={ADMIN_ORGANIZATION_PATH[kind]}
            >
              Volver a la lista
            </Link>
          }
        >
          <p>Verifica el enlace o regresa a la lista de organizaciones.</p>
        </StatePanel>
      </div>
    );
  }

  async function handleConfirm() {
    if (!pendingAction || isProcessing) {
      return;
    }

    setIsProcessing(true);
    setModalError(null);
    setSuccessMessage(null);
    setPageError(null);

    try {
      let updated: OrganizationResponse | undefined;

      if (pendingAction.type === "deactivate") {
        updated = await setAdminOrganizationActive(kind, id, false);
      } else if (pendingAction.type === "reactivate") {
        updated = await setAdminOrganizationActive(kind, id, true);
      } else {
        updated = await changeOrganizationVerification(
          kind,
          id,
          VERIFICATION_TARGET[pendingAction.action],
        );
      }

      setPendingAction(null);

      if (pendingAction.type === "deactivate") {
        setSuccessMessage(
          `${kindThe(kind)} quedó en estado inhabilitado y en solo lectura.`,
        );
      } else if (pendingAction.type === "reactivate") {
        setSuccessMessage(`${kindThe(kind)} quedó en estado activo.`);
      } else {
        setSuccessMessage(
          updated
            ? `Verificación actualizada. Estado actual: ${verificationLabel(
                updated.verificationStatus,
              )}.`
            : "La verificación se actualizó. La información se recargará.",
        );
      }

      if (updated) {
        setOrganization(updated);
      } else {
        setReloadKey((current) => current + 1);
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setPendingAction(null);
        markSessionExpired();
        return;
      }

      const message =
        error instanceof Error
          ? error.message
          : "No se pudo completar la acción.";

      if (
        error instanceof ApiError &&
        (error.status === 404 || error.status === 409)
      ) {
        setPendingAction(null);
        setPageError(message);
        setReloadKey((current) => current + 1);
        return;
      }

      setModalError(message);
    } finally {
      setIsProcessing(false);
    }
  }

  const listHref = ADMIN_ORGANIZATION_PATH[kind];
  const detailHeader = (
    <header className="pageHeader">
      <div>
        <p className="eyebrow">ADMINISTRACIÓN</p>
        <h1>{isLoading ? "Cargando organización…" : `Detalle de ${kindNoun(kind)}`}</h1>
        <p>
          Consulta los datos institucionales, el estado operativo y la
          verificación. 
        </p>
      </div>
      <Link className="button buttonSecondary" href={listHref}>
        Volver a la lista
      </Link>
    </header>
  );

  if (isLoading) {
    return (
      <div>
        {detailHeader}
        <InlineLoading message="Cargando organización…" />
      </div>
    );
  }

  if (loadError || !organization) {
    return (
      <div>
        {detailHeader}
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
      </div>
    );
  }

  const dialogCopy = pendingAction
    ? actionDialogCopy(kind, pendingAction)
    : null;

  const headerActions = (
    <>
      <Link
        className="button buttonPrimary"
        href={adminEditPath(kind, organization.id)}
      >
        Editar
      </Link>

      {organization.operationalStatus === "ACTIVE" ? (
        <button
          className="button buttonDanger"
          type="button"
          onClick={() => {
            setModalError(null);
            setPendingAction({ type: "deactivate" });
          }}
          disabled={isProcessing}
        >
          Inhabilitar
        </button>
      ) : (
        <button
          className="button buttonPrimary"
          type="button"
          onClick={() => {
            setModalError(null);
            setPendingAction({ type: "reactivate" });
          }}
          disabled={isProcessing}
        >
          Reactivar
        </button>
      )}

      {organization.verificationStatus === "PENDING_VERIFICATION" ? (
        <>
          <button
            className="button buttonSecondary"
            type="button"
            onClick={() => {
              setModalError(null);
              setPendingAction({ type: "verification", action: "VERIFY" });
            }}
            disabled={isProcessing}
          >
            Verificar
          </button>
          <button
            className="button buttonDanger"
            type="button"
            onClick={() => {
              setModalError(null);
              setPendingAction({ type: "verification", action: "REJECT" });
            }}
            disabled={isProcessing}
          >
            Rechazar
          </button>
        </>
      ) : null}

      {organization.verificationStatus === "VERIFIED" ? (
        <button
          className="button buttonDanger"
          type="button"
          onClick={() => {
            setModalError(null);
            setPendingAction({ type: "verification", action: "REVOKE" });
          }}
          disabled={isProcessing}
        >
          Revocar verificación
        </button>
      ) : null}

      {organization.verificationStatus === "REJECTED" ? (
        <button
          className="button buttonSecondary"
          type="button"
          onClick={() => {
            setModalError(null);
            setPendingAction({ type: "verification", action: "REOPEN" });
          }}
          disabled={isProcessing}
        >
          Reabrir verificación
        </button>
      ) : null}
    </>
  );

  return (
    <div>
      {detailHeader}

      {successMessage ? (
        <Alert variant="success" title="Organización actualizada">
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

      <OrganizationDetail
        kind={kind}
        organization={organization}
        showAdministrativeData
        headerActions={headerActions}
      />

      {pendingAction && dialogCopy ? (
        <ConfirmDialog
          title={dialogCopy.title}
          description={dialogCopy.description}
          confirmLabel={dialogCopy.confirmLabel}
          variant={dialogCopy.danger ? "danger" : "primary"}
          isProcessing={isProcessing}
          error={modalError}
          details={
            <>
              <strong>{organization.name}</strong>
              <span>{organization.code}</span>
              <span>
                Estado actual: {operationalStatusLabel(organization.operationalStatus)} ·
                Verificación: {verificationLabel(organization.verificationStatus)}
              </span>
            </>
          }
          onCancel={() => {
            setPendingAction(null);
            setModalError(null);
          }}
          onConfirm={handleConfirm}
        />
      ) : null}
    </div>
  );
}
