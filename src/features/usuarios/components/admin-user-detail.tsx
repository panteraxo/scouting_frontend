"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { InlineLoading, StatePanel } from "@/components/ui/loading";
import { useAuth } from "@/features/auth/auth-provider";
import {
  documentTypeLabel,
  fullName,
  roleLabel,
  statusLabel,
} from "@/features/auth/user-labels";
import { ConfirmDialog } from "@/features/organizations/components/confirm-dialog";
import { ApiError, isAbortError } from "@/lib/api-client";
import type {
  ManagedUser,
  ManagedUserStatus,
  TemporaryPasswordResult,
} from "@/types/api";
import {
  getAdminUser,
  listOrganizationOptions,
  resetUserPassword,
  updateUserStatus,
  type OrganizationOption,
} from "../api";
import {
  canAccessAdminUsers,
  isPendingScout,
  manageBadgeClass,
  userOrganizationCode,
  userOrganizationLabel,
  userOrganizationName,
  userPosition,
} from "../labels";
import {
  ADMIN_USERS_PATH,
  adminUserEditPath,
} from "../routes";
import { TemporaryPasswordPanel } from "./temporary-password-panel";
import { UserAccessRestricted } from "./user-access-restricted";
import { UserAssignmentDialog } from "./user-assignment-dialog";

const SCOUT_REQUESTS_PATH = "/admin/solicitudes-ojeador";

const dateFormatter = new Intl.DateTimeFormat("es-PE", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Lima",
});

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date);
}

export function AdminUserDetail() {
  const { user: authUser, markSessionExpired } = useAuth();
  const isAdmin = canAccessAdminUsers(authUser?.role);
  const params = useParams();
  const rawId = params.id;
  const idValue = Array.isArray(rawId) ? rawId[0] : rawId;
  const id = Number(idValue);
  const hasValidId = Number.isInteger(id) && id > 0;

  const [managedUser, setManagedUser] = useState<ManagedUser | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [loadedRequestKey, setLoadedRequestKey] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const [academies, setAcademies] = useState<OrganizationOption[]>([]);
  const [clubs, setClubs] = useState<OrganizationOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  const [isAssignmentOpen, setIsAssignmentOpen] = useState(false);
  const [temporaryPassword, setTemporaryPassword] =
    useState<TemporaryPasswordResult | null>(null);

  const [pendingStatus, setPendingStatus] =
    useState<ManagedUserStatus | null>(null);
  const [statusProcessing, setStatusProcessing] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetProcessing, setResetProcessing] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const requestKey = `${id}:${reloadKey}`;
  const isLoading = loadedRequestKey !== requestKey;

  useEffect(() => {
    if (!isAdmin || !hasValidId) {
      return;
    }

    const controller = new AbortController();
    let isActive = true;

    getAdminUser(id, controller.signal)
      .then((data) => {
        if (!isActive) {
          return;
        }

        setManagedUser(data);
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

        setManagedUser(null);
        setLoadError(
          error instanceof Error
            ? error.message
            : "No se pudo cargar el usuario.",
        );
        setLoadedRequestKey(requestKey);
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [isAdmin, hasValidId, id, reloadKey, requestKey, markSessionExpired]);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    const controller = new AbortController();
    let isActive = true;

    Promise.all([
      listOrganizationOptions("academy", true, controller.signal),
      listOrganizationOptions("club", true, controller.signal),
    ])
      .then(([academyOptions, clubOptions]) => {
        if (!isActive) {
          return;
        }

        setAcademies(academyOptions);
        setClubs(clubOptions);
        setOptionsError(null);
      })
      .catch((error: unknown) => {
        if (!isActive || isAbortError(error)) {
          return;
        }

        setOptionsError(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar las organizaciones activas.",
        );
      })
      .finally(() => {
        if (isActive) {
          setOptionsLoading(false);
        }
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <UserAccessRestricted
        title="Detalle de usuario"
        message="Solo un administrador puede consultar y administrar cuentas."
      />
    );
  }

  if (!hasValidId) {
    return (
      <div>
        <header className="pageHeader">
          <div>
            <p className="eyebrow">ADMINISTRACIÓN</p>
            <h1>Usuario no válido</h1>
            <p>La dirección de esta página no es válida.</p>
          </div>
        </header>
        <StatePanel
          title="No se pudo abrir el detalle"
          action={
            <Link className="button buttonSecondary" href={ADMIN_USERS_PATH}>
              Volver a la lista
            </Link>
          }
        >
          <p>Verifica el enlace o regresa a la lista de usuarios.</p>
        </StatePanel>
      </div>
    );
  }

  async function handleStatusConfirm() {
    if (!pendingStatus || statusProcessing) {
      return;
    }

    setStatusProcessing(true);
    setStatusError(null);
    setPageError(null);
    setSuccessMessage(null);

    try {
      const updated = await updateUserStatus(id, pendingStatus);

      if (updated) {
        setManagedUser(updated);
      } else {
        setReloadKey((current) => current + 1);
      }

      setSuccessMessage(
        pendingStatus === "ACTIVE"
          ? "La cuenta quedó activa."
          : "La cuenta quedó inhabilitada y no podrá iniciar sesión.",
      );
      setPendingStatus(null);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setPendingStatus(null);
        markSessionExpired();
        return;
      }

      const message =
        error instanceof Error
          ? error.message
          : "No se pudo cambiar el estado de la cuenta.";

      if (
        error instanceof ApiError &&
        (error.status === 404 || error.status === 409)
      ) {
        setPendingStatus(null);
        setPageError(message);
        setReloadKey((current) => current + 1);
        return;
      }

      setStatusError(message);
    } finally {
      setStatusProcessing(false);
    }
  }

  async function handleResetConfirm() {
    if (resetProcessing) {
      return;
    }

    setResetProcessing(true);
    setResetError(null);
    setPageError(null);
    setSuccessMessage(null);

    try {
      const result = await resetUserPassword(id);

      setTemporaryPassword(result);
      setIsResetOpen(false);

      // El reseteo devuelve un resumen de cuenta; se recarga el detalle para
      // conservar documento, teléfono y marcas de tiempo.
      setReloadKey((current) => current + 1);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setIsResetOpen(false);
        markSessionExpired();
        return;
      }

      setResetError(
        error instanceof Error
          ? error.message
          : "No se pudo restablecer la contraseña.",
      );
    } finally {
      setResetProcessing(false);
    }
  }

  const header = (
    <header className="pageHeader">
      <div>
        <p className="eyebrow">ADMINISTRACIÓN</p>
        <h1>
          {isLoading
            ? "Cargando usuario…"
            : managedUser
              ? fullName(managedUser)
              : "Detalle de usuario"}
        </h1>
        <p>
          Consulta la identidad, el estado de la cuenta y su asignación. Tus
          permisos se verifican automáticamente en cada operación.
        </p>
      </div>
      <Link className="button buttonSecondary" href={ADMIN_USERS_PATH}>
        Volver a la lista
      </Link>
    </header>
  );

  if (isLoading) {
    return (
      <div>
        {header}
        <InlineLoading message="Cargando usuario…" />
      </div>
    );
  }

  if (loadError || !managedUser) {
    return (
      <div>
        {header}
        <Alert variant="error" title="No se pudo cargar el usuario">
          <p>{loadError ?? "El usuario no está disponible."}</p>
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

  const pending = isPendingScout(managedUser);
  const isSelf = managedUser.id === authUser?.id;
  const organizationName = userOrganizationName(managedUser);
  const organizationCode = userOrganizationCode(managedUser);
  const position = userPosition(managedUser);

  const headerActions = (
    <>
      {!pending ? (
        <Link
          className="button buttonPrimary"
          href={adminUserEditPath(managedUser.id)}
        >
          Editar identidad
        </Link>
      ) : null}

      {!pending ? (
        <>
          {!isSelf ? (
            <button
              className="button buttonSecondary"
              type="button"
              onClick={() => {
                setPageError(null);
                setSuccessMessage(null);
                setIsAssignmentOpen(true);
              }}
              disabled={statusProcessing || resetProcessing}
            >
              Cambiar rol o asignación
            </button>
          ) : null}

          {managedUser.status === "ACTIVE" && !isSelf ? (
            <button
              className="button buttonDanger"
              type="button"
              onClick={() => {
                setStatusError(null);
                setPendingStatus("INACTIVE");
              }}
              disabled={statusProcessing || resetProcessing}
            >
              Inhabilitar cuenta
            </button>
          ) : null}

          {managedUser.status === "INACTIVE" ? (
            <button
              className="button buttonPrimary"
              type="button"
              onClick={() => {
                setStatusError(null);
                setPendingStatus("ACTIVE");
              }}
              disabled={statusProcessing || resetProcessing}
            >
              Activar cuenta
            </button>
          ) : null}

          {managedUser.status === "ACTIVE" && !isSelf ? (
            <button
              className="button buttonSecondary"
              type="button"
              onClick={() => {
                setResetError(null);
                setIsResetOpen(true);
              }}
              disabled={statusProcessing || resetProcessing}
            >
              Restablecer contraseña
            </button>
          ) : null}
        </>
      ) : (
        <Link className="button buttonSecondary" href={SCOUT_REQUESTS_PATH}>
          Revisar solicitud de ojeador
        </Link>
      )}
    </>
  );

  return (
    <div>
      {header}

      {temporaryPassword ? (
        <TemporaryPasswordPanel
          temporaryPassword={temporaryPassword.temporaryPassword}
          temporaryPasswordExpiresAt={
            temporaryPassword.temporaryPasswordExpiresAt
          }
          onDismiss={() => setTemporaryPassword(null)}
        />
      ) : null}

      {successMessage ? (
        <Alert variant="success" title="Usuario actualizado">
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

      {pending ? (
        <Alert variant="info" title="Solicitud de ojeador pendiente">
          <p>
            Esta cuenta está pendiente de aprobación. La aprobación o el rechazo
            se realizan exclusivamente en{" "}
            <Link href={SCOUT_REQUESTS_PATH}>Solicitudes de ojeador</Link>.
          </p>
        </Alert>
      ) : null}

      <div className="detailHeader">
        <div className="detailIdentity">
          <span className="detailLogoFallback" aria-hidden="true">
            {(managedUser.firstName.charAt(0) + managedUser.lastName.charAt(0))
              .toUpperCase()
              .slice(0, 2) || "US"}
          </span>
          <div>
            <p className="detailCode">{managedUser.email}</p>
            <h2 className="detailTitle">{fullName(managedUser)}</h2>
            <p className="detailMeta">
              {roleLabel(managedUser.role)} · @{managedUser.username}
            </p>
            <div className="badgeRow">
              <span className={manageBadgeClass(managedUser.status)}>
                {statusLabel(managedUser.status)}
              </span>
              {managedUser.mustChangePassword ? (
                <span className="statusBadge statusPending">
                  Debe cambiar contraseña
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="toolbarActions">{headerActions}</div>
      </div>

      <div className="detailGrid">
        <section className="card" aria-labelledby="user-identity-title">
          <h2 id="user-identity-title">Identidad</h2>
          <dl className="metaList">
            <div>
              <dt>Nombres</dt>
              <dd>{managedUser.firstName}</dd>
            </div>
            <div>
              <dt>Apellidos</dt>
              <dd>{managedUser.lastName}</dd>
            </div>
            <div>
              <dt>Documento</dt>
              <dd>
                {managedUser.documentType && managedUser.documentNumber
                  ? `${documentTypeLabel(managedUser.documentType)} · ${managedUser.documentNumber}`
                  : "No informado"}
              </dd>
            </div>
            <div>
              <dt>Correo</dt>
              <dd>{managedUser.email}</dd>
            </div>
            <div>
              <dt>Teléfono</dt>
              <dd>{managedUser.phone || "No registrado"}</dd>
            </div>
          </dl>
        </section>

        <section className="card" aria-labelledby="user-account-title">
          <h2 id="user-account-title">Cuenta</h2>
          <dl className="metaList">
            <div>
              <dt>Usuario</dt>
              <dd>@{managedUser.username}</dd>
            </div>
            <div>
              <dt>Rol</dt>
              <dd>{roleLabel(managedUser.role)}</dd>
            </div>
            <div>
              <dt>Estado</dt>
              <dd>{statusLabel(managedUser.status)}</dd>
            </div>
            <div>
              <dt>Contraseña</dt>
              <dd>
                {managedUser.mustChangePassword
                  ? "Temporal; debe cambiarla"
                  : "Definitiva"}
              </dd>
            </div>
            {managedUser.mustChangePassword &&
            managedUser.temporaryPasswordExpiresAt ? (
              <div>
                <dt>Vigencia de la temporal</dt>
                <dd>
                  {formatDate(managedUser.temporaryPasswordExpiresAt)}
                </dd>
              </div>
            ) : null}
            <div>
              <dt>Creada</dt>
              <dd>{formatDate(managedUser.createdAt)}</dd>
            </div>
            <div>
              <dt>Actualizada</dt>
              <dd>{formatDate(managedUser.updatedAt)}</dd>
            </div>
          </dl>
          <p className="footnote">
            La interfaz nunca muestra contraseñas.
          </p>
          {isSelf ? (
            <p className="footnote">
              No puedes degradar ni inhabilitar tu propia cuenta desde esta
              pantalla. Para cambiar tu propia contraseña, usa la opción de
              seguridad del inicio.
            </p>
          ) : null}
        </section>

        <section className="card" aria-labelledby="user-org-title">
          <h2 id="user-org-title">Organización</h2>
          <dl className="metaList">
            <div>
              <dt>Asignación</dt>
              <dd>{userOrganizationLabel(managedUser)}</dd>
            </div>
            <div>
              <dt>Código</dt>
              <dd>{organizationCode ?? "—"}</dd>
            </div>
            <div>
              <dt>Cargo</dt>
              <dd>
                {managedUser.role === "CLUB_MANAGER"
                  ? position ?? "No registrado"
                  : "No aplica"}
              </dd>
            </div>
          </dl>
          {!organizationName && managedUser.role !== "ADMIN" && managedUser.role !== "SCOUT" ? (
            <p className="footnote">
              No se registró una organización asignada. Puedes corregirla desde
              «Cambiar rol o asignación».
            </p>
          ) : null}
        </section>
      </div>

      <p className="footnote">
        El teléfono pertenece a la cuenta y es opcional. Esta vista no incluye
        datos de tutor ni notas privadas de ojeadores.
      </p>

      {isAssignmentOpen ? (
        <UserAssignmentDialog
          user={managedUser}
          academies={academies}
          clubs={clubs}
          optionsLoading={optionsLoading}
          optionsError={optionsError}
          onCancel={() => setIsAssignmentOpen(false)}
          onSessionExpired={() => {
            setIsAssignmentOpen(false);
            markSessionExpired();
          }}
          onSaved={(updated) => {
            setIsAssignmentOpen(false);
            setSuccessMessage("Rol y organización actualizados.");
            if (updated) {
              setManagedUser(updated);
            } else {
              setReloadKey((current) => current + 1);
            }
          }}
        />
      ) : null}

      {pendingStatus ? (
        <ConfirmDialog
          title={
            pendingStatus === "ACTIVE" ? "Activar cuenta" : "Inhabilitar cuenta"
          }
          description={
            pendingStatus === "ACTIVE"
              ? "La cuenta podrá iniciar sesión nuevamente, siempre que su contraseña siga vigente."
              : "La cuenta dejará de poder iniciar sesión. No se elimina ni se pierden sus relaciones."
          }
          confirmLabel={
            pendingStatus === "ACTIVE" ? "Activar cuenta" : "Inhabilitar cuenta"
          }
          variant={pendingStatus === "ACTIVE" ? "primary" : "danger"}
          isProcessing={statusProcessing}
          error={statusError}
          details={
            <>
              <strong>{fullName(managedUser)}</strong>
              <span>{managedUser.email}</span>
              <span>Rol actual: {roleLabel(managedUser.role)}</span>
            </>
          }
          onCancel={() => {
            setPendingStatus(null);
            setStatusError(null);
          }}
          onConfirm={handleStatusConfirm}
        />
      ) : null}

      {isResetOpen ? (
        <ConfirmDialog
          title="Restablecer contraseña"
          description="Se generará una contraseña temporal de un solo uso. La contraseña anterior dejará de funcionar y el usuario deberá cambiarla en su próximo acceso."
          confirmLabel="Generar contraseña temporal"
          isProcessing={resetProcessing}
          error={resetError}
          details={
            <>
              <strong>{fullName(managedUser)}</strong>
              <span>{managedUser.email}</span>
              <span>
                La contraseña temporal se mostrará una sola vez y no se guarda en
                el navegador.
              </span>
            </>
          }
          onCancel={() => {
            setIsResetOpen(false);
            setResetError(null);
          }}
          onConfirm={handleResetConfirm}
        />
      ) : null}
    </div>
  );
}
