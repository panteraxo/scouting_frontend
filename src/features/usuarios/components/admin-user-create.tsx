"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/loading";
import { useAuth } from "@/features/auth/auth-provider";
import { ApiError, isAbortError } from "@/lib/api-client";
import type {
  CreateUserResult,
  UserCreateInput,
  UserRole,
} from "@/types/api";
import {
  createAdminUser,
  listOrganizationOptions,
  type OrganizationOption,
} from "../api";
import {
  EMPTY_IDENTITY,
  identityPayload,
  validateAssignment,
  validateIdentity,
  type FormErrors,
  type IdentityFormValues,
} from "../form";
import {
  CREATABLE_USER_ROLES,
  DEFAULT_CREATABLE_USER_ROLE,
  roleRequiresAcademy,
  roleRequiresClub,
} from "../labels";
import {
  ADMIN_USERS_PATH,
  adminUserDetailPath,
} from "../routes";
import { TemporaryPasswordPanel } from "./temporary-password-panel";
import { UserAccessRestricted } from "./user-access-restricted";
import { UserAssignmentFields } from "./user-assignment-fields";
import { UserIdentityFields } from "./user-identity-fields";

export function AdminUserCreate() {
  const { user, markSessionExpired } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [identity, setIdentity] =
    useState<IdentityFormValues>(EMPTY_IDENTITY);
  const [role, setRole] = useState<UserRole>(DEFAULT_CREATABLE_USER_ROLE);
  const [academyId, setAcademyId] = useState("");
  const [clubId, setClubId] = useState("");
  const [position, setPosition] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<CreateUserResult | null>(null);

  const [academies, setAcademies] = useState<OrganizationOption[]>([]);
  const [clubs, setClubs] = useState<OrganizationOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState<string | null>(null);

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
        title="Nuevo usuario"
        message="Solo un administrador puede crear cuentas de cualquier rol."
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

  function handleRoleChange(nextRole: UserRole) {
    setRole(nextRole);
    setFormError(null);

    if (!roleRequiresAcademy(nextRole)) {
      setAcademyId("");
    }

    if (!roleRequiresClub(nextRole)) {
      setClubId("");
      setPosition("");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = {
      ...validateIdentity(identity),
      ...validateAssignment(role, academyId, clubId),
    };

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setFormError("Revisa los campos marcados e intenta nuevamente.");
      return;
    }

    const input: UserCreateInput = {
      ...identityPayload(identity),
      role,
    };

    if (roleRequiresAcademy(role)) {
      input.academyId = Number(academyId);
    }

    if (roleRequiresClub(role)) {
      input.clubId = Number(clubId);
      input.position = position.trim();
    }

    setErrors({});
    setFormError(null);
    setIsSubmitting(true);

    try {
      const created = await createAdminUser(input);
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
            <p className="eyebrow">ADMINISTRACIÓN</p>
            <h1>Usuario creado</h1>
            <p>
              La cuenta quedó activa con una contraseña temporal de un solo uso.
              El usuario deberá cambiarla en su próximo acceso.
            </p>
          </div>
          <Link className="button buttonSecondary" href={ADMIN_USERS_PATH}>
            Volver a la lista
          </Link>
        </header>

        <Alert variant="success" title="Cuenta creada">
          <p>
            <strong>
              {result.user.firstName} {result.user.lastName}
            </strong>{" "}
            ({result.user.email}) fue creada correctamente.
          </p>
        </Alert>

        <TemporaryPasswordPanel
          temporaryPassword={result.temporaryPassword}
          temporaryPasswordExpiresAt={result.temporaryPasswordExpiresAt}
        />

        <div className="formActions sectionSpacer">
          <Link
            className="button buttonPrimary"
            href={adminUserDetailPath(result.user.id)}
          >
            Ver detalle
          </Link>
          <Link className="button buttonSecondary" href={ADMIN_USERS_PATH}>
            Ir a la lista
          </Link>
          <button
            className="button buttonGhost"
            type="button"
            onClick={() => {
              setResult(null);
              setIdentity(EMPTY_IDENTITY);
              setRole(DEFAULT_CREATABLE_USER_ROLE);
              setAcademyId("");
              setClubId("");
              setPosition("");
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

  return (
    <div>
      <header className="pageHeader">
        <div>
          <p className="eyebrow">ADMINISTRACIÓN</p>
          <h1>Nuevo usuario</h1>
          <p>
            Crea una cuenta con un rol y una organización cuando corresponda. No
            se define contraseña manualmente: el sistema genera una temporal y la
            muestra una sola vez.
          </p>
        </div>
        <Link className="button buttonSecondary" href={ADMIN_USERS_PATH}>
          Volver a la lista
        </Link>
      </header>

      {formError ? (
        <Alert variant="error" title="No se pudo crear la cuenta">
          <p>{formError}</p>
        </Alert>
      ) : null}

      <section className="card">
        <form className="form" onSubmit={handleSubmit} noValidate>
          <div className="formSection">
            <h2 className="formSectionTitle">Datos de identidad</h2>
            <UserIdentityFields
              values={identity}
              errors={errors}
              disabled={isSubmitting}
              onChange={handleIdentityChange}
            />
          </div>

          <UserAssignmentFields
            role={role}
            roleOptions={CREATABLE_USER_ROLES}
            academyId={academyId}
            clubId={clubId}
            position={position}
            errors={errors}
            academies={academies}
            clubs={clubs}
            optionsLoading={optionsLoading}
            optionsError={optionsError}
            disabled={isSubmitting}
            onRoleChange={handleRoleChange}
            onAcademyChange={(value) => {
              setAcademyId(value);
              setErrors((current) => ({ ...current, academyId: "" }));
            }}
            onClubChange={(value) => {
              setClubId(value);
              setErrors((current) => ({ ...current, clubId: "" }));
            }}
            onPositionChange={(value) => {
              setPosition(value);
              setErrors((current) => ({ ...current, position: "" }));
            }}
          />

          <div className="formActions">
            <button
              className="button buttonPrimary"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Spinner /> : null}
              {isSubmitting ? "Creando cuenta…" : "Crear usuario"}
            </button>
            <Link className="button buttonSecondary" href={ADMIN_USERS_PATH}>
              Cancelar
            </Link>
          </div>
        </form>
      </section>

      <p className="footnote">
        El teléfono es opcional y corresponde a la cuenta. Esta pantalla no
        registra datos de tutor ni notas privadas de ojeadores.
      </p>
    </div>
  );
}
