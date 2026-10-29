"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { InlineLoading, StatePanel } from "@/components/ui/loading";
import { useAuth } from "@/features/auth/auth-provider";
import { ApiError, isAbortError } from "@/lib/api-client";
import type {
  OrganizationDirectoryResponse,
  OrganizationKind,
} from "@/types/api";
import { kindNoun } from "../labels";
import { getDirectoryOrganization } from "../organizations-api";
import { READ_ONLY_ORGANIZATION_PATH } from "../routes";
import { OrganizationAccessRestricted } from "./organization-access-restricted";
import { OrganizationDetail } from "./organization-detail";

export function OrganizationDirectoryDetail({
  kind,
}: {
  kind: OrganizationKind;
}) {
  const { user, markSessionExpired } = useAuth();
  const canRead = user?.role === "ADMIN" || user?.role === "SCOUT";
  const isAcademy = kind === "academy";
  const listNoun = isAcademy ? "academias" : "clubes";
  const params = useParams();
  const rawId = params.id;
  const idValue = Array.isArray(rawId) ? rawId[0] : rawId;
  const id = Number(idValue);
  const hasValidId = Number.isInteger(id) && id > 0;

  const [organization, setOrganization] =
    useState<OrganizationDirectoryResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [loadedRequestKey, setLoadedRequestKey] = useState<string | null>(
    null,
  );

  const requestKey = `${kind}:${id}:${reloadKey}`;
  const isLoading = loadedRequestKey !== requestKey;

  useEffect(() => {
    if (!canRead || !hasValidId) {
      return;
    }

    const controller = new AbortController();
    let isActive = true;

    getDirectoryOrganization(kind, id, controller.signal)
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
    canRead,
    hasValidId,
    kind,
    id,
    reloadKey,
    requestKey,
    markSessionExpired,
  ]);

  if (!canRead) {
    return (
      <OrganizationAccessRestricted
        title={isAcademy ? "Academias" : "Clubes"}
        message="Este módulo está disponible para administradores y ojeadores habilitados."
      />
    );
  }

  const listHref = READ_ONLY_ORGANIZATION_PATH[kind];

  if (!hasValidId) {
    return (
      <div>
        <header className="pageHeader">
          <div>
            <p className="eyebrow">{isAcademy ? "ACADEMIA" : "CLUB"}</p>
            <h1>Organización no válida</h1>
            <p>La dirección de esta página no es válida.</p>
          </div>
        </header>
        <StatePanel
          title="No se pudo abrir el detalle"
          action={
            <Link className="button buttonSecondary" href={listHref}>
              Volver a {listNoun}
            </Link>
          }
        >
          <p>Verifica el enlace o regresa a {listNoun}.</p>
        </StatePanel>
      </div>
    );
  }

  return (
    <div>
      <header className="pageHeader">
        <div>
          <p className="eyebrow">{isAcademy ? "ACADEMIA" : "CLUB"}</p>
          <h1>Detalle de {kindNoun(kind)}</h1>
          <p>
            Información institucional de una organización activa y verificada.
            No se muestran RUC, representantes ni contactos personales.
          </p>
        </div>
        <Link className="button buttonSecondary" href={listHref}>
          Volver a {listNoun}
        </Link>
      </header>

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
        <>
          <Alert variant="info" title="Información institucional pública">
            <p>
              Esta vista de solo lectura no incluye RUC, datos de representantes
              o responsables ni contactos personales. Las notas internas no
              forman parte de esta ficha.
            </p>
          </Alert>

          <OrganizationDetail
            kind={kind}
            organization={organization}
            showAdministrativeData={false}
          />
        </>
      )}
    </div>
  );
}
