"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { SelectField } from "@/components/ui/form-field";
import { InlineLoading, Spinner, StatePanel } from "@/components/ui/loading";
import { useAuth } from "@/features/auth/auth-provider";
import { roleLabel } from "@/features/auth/user-labels";
import { PLAYER_CREATE_PATH } from "@/features/jugadores/routes";
import { getOwnOrganization } from "@/features/organizations/organizations-api";
import { OWN_ORGANIZATION_PATH } from "@/features/organizations/routes";
import { ApiError, isAbortError } from "@/lib/api-client";
import type {
  CreateUserResult,
  OrganizationResponse,
  UserCreateInput,
  UserRole,
} from "@/types/api";
import { createScopedUser } from "../api";
import {
  EMPTY_IDENTITY,
  identityPayload,
  validateIdentity,
  type FormErrors,
  type IdentityFormValues,
} from "../form";
import {
  scopedCreatableRoles,
} from "../labels";
import {
  ADMIN_USER_CREATE_PATH,
} from "../routes";
import { TemporaryPasswordPanel } from "./temporary-password-panel";
import { UserAccessRestricted } from "./user-access-restricted";
import { UserIdentityFields } from "./user-identity-fields";

export function ScopedUserCreate() {
  const { user, markSessionExpired } = useAuth();
  const router = useRouter();
  const role = user?.role;
  const creatableRoles = scopedCreatableRoles(role);
  const isAdmin = role === "ADMIN";
  const canCreate = creatableRoles.length > 0;

  const [academy, setAcademy] = useState<OrganizationResponse | null>(null);
  const [academyLoading, setAcademyLoading] = useState(canCreate);
  const [academyError, setAcademyError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>(
    creatableRoles[0] ?? "PROFESSOR",
  );
  const [identity, setIdentity] =
    useState<IdentityFormValues>(EMPTY_IDENTITY);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<CreateUserResult | null>(null);

  useEffect(() => {
    if (isAdmin) {
      router.replace(ADMIN_USER_CREATE_PATH);
    }
  }, [isAdmin, router]);

  useEffect(() => {
    if (!canCreate) {
      return;
    }

    const controller = new AbortController();
    let isActive = true;

    getOwnOrganization("academy", controller.signal)
      .then((data) => {
        if (!isActive) {
          return;
        }

        setAcademy(data);
        setAcademyError(null);
      })
      .catch((error: unknown) => {
        if (!isActive || isAbortError(error)) {
          return;
        }

        if (error instanceof ApiError && error.status === 401) {
          markSessionExpired();
          return;
        }

        setAcademy(null);
        setAcademyError(
          error instanceof Error
            ? error.message
            : "No se pudo cargar tu academia.",
        );
      })
      .finally(() => {
        if (isActive) {
          setAcademyLoading(false);
        }
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [canCreate, markSessionExpired]);

  if (isAdmin) {
    return (
      <div className="card">
        <InlineLoading message="Abriendo el formulario de administración…" />
      </div>
    );
  }

  if (!canCreate) {
    if (role === "PROFESSOR") {
      return (
        <div>
          <header className="pageHeader">
            <div>
              <p className="eyebrow">MI ACADEMIA</p>
              <h1>Crear usuario</h1>
              <p>
                Las cuentas de jugador se crean junto con su perfil deportivo
                desde el módulo Jugadores.
              </p>
            </div>
            <Link
              className="button buttonSecondary"
              href={OWN_ORGANIZATION_PATH.academy}
            >
              Ir a mi academia
            </Link>
          </header>

          <StatePanel
            title="Sin roles disponibles"
            action={
              <Link className="button buttonPrimary" href={PLAYER_CREATE_PATH}>
                Nuevo jugador
              </Link>
            }
          >
            <p>
              Tu rol ya no crea cuentas desde este módulo. Registra al jugador en
              Jugadores → Nuevo jugador: allí se crean la cuenta y el perfil
              deportivo en una sola operación.
            </p>
          </StatePanel>
        </div>
      );
    }

    return (
      <UserAccessRestricted
        title="Crear usuario"
        message="Solo un Director de academia puede crear cuentas desde este módulo. Las cuentas de jugador se crean desde Jugadores."
      />
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

    if (academy?.operationalStatus === "INACTIVE") {
      setFormError(
        "Tu academia está inhabilitada y solo admite lectura. No es posible crear cuentas.",
      );
      return;
    }

    const nextErrors = validateIdentity(identity);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setFormError("Revisa los campos marcados e intenta nuevamente.");
      return;
    }

    const input: UserCreateInput = {
      ...identityPayload(identity),
      role: selectedRole,
    };

    setErrors({});
    setFormError(null);
    setIsSubmitting(true);

    try {
      const created = await createScopedUser(input);
      setResult(created);
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
            : "No se pudo crear la cuenta.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (result) {
    return (
      <div>
        <header className="pageHeader">
          <div>
            <p className="eyebrow">MI ACADEMIA</p>
            <h1>Usuario creado</h1>
            <p>
              La cuenta quedó activa en{" "}
              {academy ? academy.name : "tu academia"} con una contraseña
              temporal de un solo uso.
            </p>
          </div>
          <Link
            className="button buttonSecondary"
            href={OWN_ORGANIZATION_PATH.academy}
          >
            Ir a mi academia
          </Link>
        </header>

        <Alert variant="success" title="Cuenta creada">
          <p>
            <strong>
              {result.user.firstName} {result.user.lastName}
            </strong>{" "}
            ({result.user.email}) fue creada con rol{" "}
            {roleLabel(result.user.role)}.
          </p>
        </Alert>

        <TemporaryPasswordPanel
          temporaryPassword={result.temporaryPassword}
          temporaryPasswordExpiresAt={result.temporaryPasswordExpiresAt}
        />

        <div className="formActions sectionSpacer">
          <Link
            className="button buttonPrimary"
            href={OWN_ORGANIZATION_PATH.academy}
          >
            Ver mi academia
          </Link>
          <Link className="button buttonSecondary" href="/inicio">
            Volver al inicio
          </Link>
          <button
            className="button buttonGhost"
            type="button"
            onClick={() => {
              setResult(null);
              setIdentity(EMPTY_IDENTITY);
              setSelectedRole(creatableRoles[0] ?? "PROFESSOR");
              setErrors({});
              setFormError(null);
            }}
          >
            Crear otro usuario
          </button>
        </div>
      </div>
    );
  }

  const academyInactive = academy?.operationalStatus === "INACTIVE";

  return (
    <div>
      <header className="pageHeader">
        <div>
          <p className="eyebrow">MI ACADEMIA</p>
          <h1>Crear usuario</h1>
          <p>
            Puedes crear cuentas de Profesor dentro de tu academia. Las cuentas de
            jugador se crean junto con su perfil desde Jugadores → Nuevo jugador.
          </p>
        </div>
        <Link
          className="button buttonSecondary"
          href={OWN_ORGANIZATION_PATH.academy}
        >
          Ir a mi academia
        </Link>
      </header>

      {academyLoading ? (
        <div className="card">
          <InlineLoading message="Cargando tu academia…" />
        </div>
      ) : academyError ? (
        <Alert variant="error" title="No se pudo cargar tu academia">
          <p>{academyError}</p>
        </Alert>
      ) : (
        <Alert
          variant={academyInactive ? "warning" : "info"}
          title={
            academyInactive ? "Academia inhabilitada" : "Permisos de la cuenta"
          }
        >
          <p>
            {academy ? (
              <>
                La cuenta se creará en <strong>{academy.name}</strong> (
                {academy.code}). No necesitas indicar la academia: se asigna
                automáticamente a la de tu cuenta.
              </>
            ) : (
              <>
                No se encontró una academia asignada a tu cuenta. No es posible
                crear usuarios sin una academia.
              </>
            )}
          </p>
          {academyInactive ? (
            <p>
              La academia está inhabilitada y solo admite lectura. Crea o
              administra la organización antes de volver a intentarlo.
            </p>
          ) : null}
        </Alert>
      )}

      {formError ? (
        <Alert variant="error" title="No se pudo crear la cuenta">
          <p>{formError}</p>
        </Alert>
      ) : null}

      <section className="card">
        <form className="form" onSubmit={handleSubmit} noValidate>
          <div className="formSection">
            <h2 className="formSectionTitle">Rol en la academia</h2>
            {creatableRoles.length === 1 ? (
              <p className="formSectionNote">
                Tu rol solo permite crear cuentas de{" "}
                <strong>{roleLabel(creatableRoles[0])}</strong>.
              </p>
            ) : (
              <SelectField
                label="Rol"
                name="role"
                value={selectedRole}
                onChange={(event) =>
                  setSelectedRole(event.target.value as UserRole)
                }
                hint="Solo se ofrecen los roles permitidos para tu cuenta."
                disabled={isSubmitting || academyInactive}
                required
              >
                {creatableRoles.map((option) => (
                  <option key={option} value={option}>
                    {roleLabel(option)}
                  </option>
                ))}
              </SelectField>
            )}
          </div>

          <div className="formSection">
            <h2 className="formSectionTitle">Datos de identidad</h2>
            <UserIdentityFields
              values={identity}
              errors={errors}
              disabled={isSubmitting || academyInactive}
              onChange={handleIdentityChange}
            />
          </div>

          <div className="formActions">
            <button
              className="button buttonPrimary"
              type="submit"
              disabled={
                isSubmitting ||
                academyLoading ||
                Boolean(academyError) ||
                !academy ||
                academyInactive
              }
            >
              {isSubmitting ? <Spinner /> : null}
              {isSubmitting ? "Creando cuenta…" : "Crear usuario"}
            </button>
            <Link
              className="button buttonSecondary"
              href={OWN_ORGANIZATION_PATH.academy}
            >
              Cancelar
            </Link>
          </div>
        </form>
      </section>

      <p className="footnote">
        La cuenta se crea activa con una contraseña temporal generada por el
        sistema. La contraseña no la define quien crea la cuenta.
        {academy ? ` Organización: ${academy.name}.` : ""}
      </p>
    </div>
  );
}
