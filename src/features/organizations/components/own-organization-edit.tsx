"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { InlineLoading, StatePanel } from "@/components/ui/loading";
import { useAuth } from "@/features/auth/auth-provider";
import { ApiError, isAbortError } from "@/lib/api-client";
import type {
  OrganizationInput,
  OrganizationKind,
  OrganizationResponse,
} from "@/types/api";
import { kindNoun, kindTitle, verificationLabel } from "../labels";
import {
  getOwnOrganization,
  updateOwnOrganization,
} from "../organizations-api";
import { OWN_ORGANIZATION_PATH } from "../routes";
import { OrganizationAccessRestricted } from "./organization-access-restricted";
import { OrganizationForm } from "./organization-form";

export function OwnOrganizationEdit({
  kind,
}: {
  kind: OrganizationKind;
}) {
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

  const requestKey = `${kind}:${reloadKey}`;
  const isLoading = loadedRequestKey !== requestKey;

  useEffect(() => {
    if (!hasAccess || !canManage) {
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
              : "No se pudo cargar la organización.",
        );
        setLoadedRequestKey(requestKey);
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [
    hasAccess,
    canManage,
    kind,
    reloadKey,
    requestKey,
    markSessionExpired,
  ]);

  if (!hasAccess) {
    return (
      <OrganizationAccessRestricted
        title={kind === "academy" ? "Editar mi academia" : "Editar mi club"}
        message={
          kind === "academy"
            ? "Este módulo está disponible para Directores de academia."
            : "Este módulo está disponible para Responsables de club."
        }
      />
    );
  }

  if (!canManage) {
    return (
      <OrganizationAccessRestricted
        title={kind === "academy" ? "Editar mi academia" : "Editar mi club"}
        message="Tu rol solo permite consultar la organización, no editarla."
      />
    );
  }

  const detailHref = OWN_ORGANIZATION_PATH[kind];

  async function handleSubmit(
    input: OrganizationInput,
  ): Promise<OrganizationResponse | undefined> {
    const result = await updateOwnOrganization(kind, input);

    if (result) {
      setOrganization(result);
      setSuccessMessage(
        result.verificationStatus === "PENDING_VERIFICATION"
          ? `Los cambios se guardaron. La verificación quedó en estado ${verificationLabel(
              result.verificationStatus,
            )} y requiere revisión del Administrador.`
          : "Los cambios se guardaron correctamente.",
      );
    } else {
      setSuccessMessage(
        "Los cambios se guardaron. La información se recargará.",
      );
      setReloadKey((current) => current + 1);
    }

    return result;
  }

  return (
    <div>
      <header className="pageHeader">
        <div>
          <p className="eyebrow">MI ORGANIZACIÓN</p>
          <h1>{kind === "academy" ? "Editar mi academia" : "Editar mi club"}</h1>
          <p>
            Actualiza los datos permitidos de tu {kindNoun(kind)}. El código
            visible y la verificación solo los gestiona el Administrador.
          </p>
        </div>
        <Link className="button buttonSecondary" href={detailHref}>
          Volver al detalle
        </Link>
      </header>

      {successMessage ? (
        <Alert variant="success" title="Cambios guardados">
          <p>{successMessage}</p>
        </Alert>
      ) : null}

      {isLoading ? (
        <InlineLoading message="Cargando organización…" />
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
      ) : organization.operationalStatus === "INACTIVE" ? (
        <StatePanel
          title="Organización inhabilitada"
          action={
            <Link className="button buttonSecondary" href={detailHref}>
              Volver al detalle
            </Link>
          }
        >
          <p>
            La organización está en solo lectura. No se puede editar mientras un
            administrador no la reactive.
          </p>
        </StatePanel>
      ) : (
        <section className="card" aria-labelledby="own-edit-title">
          <h2 className="cardTitle" id="own-edit-title">
            {kindTitle(kind)} {organization.code}
          </h2>

          <OrganizationForm
            kind={kind}
            mode="edit"
            singleColumn={kind === "club"}
            initial={organization}
            submitLabel="Guardar cambios"
            cancelHref={detailHref}
            onSubmit={handleSubmit}
            warning={
              <Alert variant="warning" title="La verificación puede reiniciarse">
                <p>
                  Los cambios de contenido pueden devolver la verificación a
                  Pendiente de verificación. Un administrador deberá revisarla
                  nuevamente. Un envío idéntico no la reinicia.
                </p>
              </Alert>
            }
          />
        </section>
      )}
    </div>
  );
}
