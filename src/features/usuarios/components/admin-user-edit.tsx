"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Spinner, InlineLoading, StatePanel } from "@/components/ui/loading";
import { useAuth } from "@/features/auth/auth-provider";
import { fullName } from "@/features/auth/user-labels";
import { ApiError, isAbortError } from "@/lib/api-client";
import type { ManagedUser } from "@/types/api";
import { getAdminUser, updateUserIdentity } from "../api";
import {
  identityFromUser,
  identityPayload,
  validateIdentity,
  EMPTY_IDENTITY,
  type FormErrors,
  type IdentityFormValues,
} from "../form";
import { canAccessAdminUsers, isPendingScout } from "../labels";
import {
  ADMIN_USERS_PATH,
  adminUserDetailPath,
} from "../routes";
import { UserAccessRestricted } from "./user-access-restricted";
import { UserIdentityFields } from "./user-identity-fields";

const SCOUT_REQUESTS_PATH = "/admin/solicitudes-ojeador";

export function AdminUserEdit() {
  const { user: authUser, markSessionExpired } = useAuth();
  const isAdmin = canAccessAdminUsers(authUser?.role);
  const params = useParams();
  const rawId = params.id;
  const idValue = Array.isArray(rawId) ? rawId[0] : rawId;
  const id = Number(idValue);
  const hasValidId = Number.isInteger(id) && id > 0;

  const [managedUser, setManagedUser] = useState<ManagedUser | null>(null);
  const [identity, setIdentity] =
    useState<IdentityFormValues>(EMPTY_IDENTITY);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [loadedRequestKey, setLoadedRequestKey] = useState<string | null>(null);

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
        setIdentity(identityFromUser(data));
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

  if (!isAdmin) {
    return (
      <UserAccessRestricted
        title="Editar usuario"
        message="Solo un administrador puede editar la identidad de una cuenta."
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
          title="No se pudo abrir la edición"
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

  function handleIdentityChange(
    field: keyof IdentityFormValues,
    value: string,
  ) {
    setIdentity((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validateIdentity(identity);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setFormError("Revisa los campos marcados e intenta nuevamente.");
      return;
    }

    setErrors({});
    setFormError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const payload = identityPayload(identity);
      const updated = await updateUserIdentity(id, payload);

      if (updated) {
        setManagedUser(updated);
        setIdentity(identityFromUser(updated));
      } else {
        setManagedUser((current) =>
          current ? { ...current, ...payload } : current,
        );
      }

      setSuccessMessage("Los datos de identidad se actualizaron.");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        markSessionExpired();
        return;
      }

      if (error instanceof ApiError && error.fieldErrors) {
        setErrors(error.fieldErrors);
        setFormError("Revisa los campos marcados e intenta nuevamente.");
      } else {
        setFormError(
          error instanceof Error
            ? error.message
            : "No se pudo actualizar el usuario.",
        );
      }
    } finally {
      setIsSubmitting(false);
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
              ? `Editar a ${fullName(managedUser)}`
              : "Editar usuario"}
        </h1>
        <p>
          Actualiza los datos de identidad. El rol, la organización y el estado
          se administran desde el detalle de la cuenta.
        </p>
      </div>
      <div className="toolbarActions">
        {managedUser ? (
          <Link
            className="button buttonSecondary"
            href={adminUserDetailPath(managedUser.id)}
          >
            Ver detalle
          </Link>
        ) : null}
        <Link className="button buttonGhost" href={ADMIN_USERS_PATH}>
          Volver a la lista
        </Link>
      </div>
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

  if (isPendingScout(managedUser)) {
    return (
      <div>
        {header}
        <Alert variant="warning" title="Solicitud pendiente de aprobación">
          <p>
            Las cuentas pendientes de ojeador no se editan desde Usuarios. La
            aprobación o el rechazo se realizan en{" "}
            <Link href={SCOUT_REQUESTS_PATH}>Solicitudes de ojeador</Link>.
          </p>
        </Alert>
        <div className="formActions">
          <Link
            className="button buttonPrimary"
            href={SCOUT_REQUESTS_PATH}
          >
            Revisar solicitud
          </Link>
          <Link
            className="button buttonSecondary"
            href={adminUserDetailPath(managedUser.id)}
          >
            Ver detalle
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {header}

      {successMessage ? (
        <Alert variant="success" title="Usuario actualizado">
          <p>{successMessage}</p>
        </Alert>
      ) : null}

      {formError ? (
        <Alert variant="error" title="No se pudo actualizar el usuario">
          <p>{formError}</p>
        </Alert>
      ) : null}

      <section className="card">
        <form className="form" onSubmit={handleSubmit} noValidate>
          <div className="formSection">
            <h2 className="formSectionTitle">Datos de identidad</h2>
            <p className="formSectionNote">
              El tipo y el número de documento son obligatorios. El teléfono es
              opcional y pertenece a esta cuenta.
            </p>
            <UserIdentityFields
              values={identity}
              errors={errors}
              disabled={isSubmitting}
              onChange={handleIdentityChange}
            />
          </div>

          <div className="formActions">
            <button
              className="button buttonPrimary"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Spinner /> : null}
              {isSubmitting ? "Guardando…" : "Guardar cambios"}
            </button>
            <Link
              className="button buttonSecondary"
              href={adminUserDetailPath(managedUser.id)}
            >
              Cancelar
            </Link>
          </div>
        </form>
      </section>

      <p className="footnote">
        No se muestran ni se editan contraseñas, datos de tutor ni notas privadas
        de ojeadores desde esta pantalla.
      </p>
    </div>
  );
}
