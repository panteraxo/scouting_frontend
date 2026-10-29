"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
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
import { kindNoun, kindPlural, kindTitle } from "../labels";
import {
  getAdminOrganization,
  updateAdminOrganization,
} from "../organizations-api";
import {
  adminDetailPath,
  ADMIN_ORGANIZATION_PATH,
} from "../routes";
import { OrganizationAccessRestricted } from "./organization-access-restricted";
import { OrganizationForm } from "./organization-form";

export function AdminOrganizationEdit({
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
        title={`Editar ${kindNoun(kind)}`}
        message={`Solo un administrador puede editar ${kindPlural(kind)}.`}
      />
    );
  }

  const listHref = ADMIN_ORGANIZATION_PATH[kind];

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
          title="No se pudo abrir la edición"
          action={
            <Link className="button buttonSecondary" href={listHref}>
              Volver a la lista
            </Link>
          }
        >
          <p>Verifica el enlace o regresa a la lista de organizaciones.</p>
        </StatePanel>
      </div>
    );
  }

  async function handleSubmit(
    input: OrganizationInput,
  ): Promise<OrganizationResponse | undefined> {
    const result = await updateAdminOrganization(kind, id, input);

    if (result) {
      setOrganization(result);
      setSuccessMessage("Los cambios se guardaron correctamente.");
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
          <p className="eyebrow">ADMINISTRACIÓN</p>
          <h1>Editar {kindNoun(kind)}</h1>
          <p>
            Actualiza los datos institucionales. El código visible no se edita.
          </p>
        </div>
        <div className="toolbarActions">
          <Link
            className="button buttonSecondary"
            href={adminDetailPath(kind, id)}
          >
            Ver detalle
          </Link>
          <Link className="button buttonGhost" href={listHref}>
            Volver a la lista
          </Link>
        </div>
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
      ) : (
        <section className="card" aria-labelledby="admin-edit-title">
          <h2 className="cardTitle" id="admin-edit-title">
            {kindTitle(kind)} {organization.code}
          </h2>
          <OrganizationForm
            kind={kind}
            mode="edit"
            singleColumn={kind === "club"}
            initial={organization}
            submitLabel="Guardar cambios"
            cancelHref={adminDetailPath(kind, id)}
            onSubmit={handleSubmit}
          />
        </section>
      )}
    </div>
  );
}
