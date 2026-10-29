"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { SelectField, TextField } from "@/components/ui/form-field";
import { InlineLoading, StatePanel } from "@/components/ui/loading";
import { useAuth } from "@/features/auth/auth-provider";
import {
  fullName,
  roleLabel,
} from "@/features/auth/user-labels";
import { ApiError, isAbortError } from "@/lib/api-client";
import type {
  ManagedUserStatus,
  ManagedUserSummary,
  PageResponse,
  UserRole,
} from "@/types/api";
import {
  listOrganizationOptions,
  listUsers,
  type OrganizationOption,
} from "../api";
import {
  isPendingScout,
  manageBadgeClass,
  managedStatusLabel,
  userOrganizationCode,
  userOrganizationLabel,
} from "../labels";
import {
  ADMIN_USER_CREATE_PATH,
  adminUserEditPath,
  adminUserDetailPath,
} from "../routes";
import { UserAccessRestricted } from "./user-access-restricted";

const PAGE_SIZE = 20;
const SCOUT_REQUESTS_PATH = "/admin/solicitudes-ojeador";

interface AppliedFilters {
  q?: string;
  role?: UserRole;
  status?: ManagedUserStatus;
  academyId?: number;
  clubId?: number;
}

const ROLE_FILTER_OPTIONS: Array<{ value: UserRole; label: string }> = [
  { value: "ADMIN", label: "Administrador" },
  { value: "ACADEMY_DIRECTOR", label: "Director de academia" },
  { value: "PROFESSOR", label: "Profesor" },
  { value: "CLUB_MANAGER", label: "Responsable de club" },
  { value: "SCOUT", label: "Ojeador" },
  { value: "PLAYER", label: "Jugador" },
];

export function AdminUserList() {
  const { user, markSessionExpired } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [qDraft, setQDraft] = useState("");
  const [roleDraft, setRoleDraft] = useState<"" | UserRole>("");
  const [statusDraft, setStatusDraft] = useState<"" | ManagedUserStatus>("");
  const [academyDraft, setAcademyDraft] = useState("");
  const [clubDraft, setClubDraft] = useState("");
  const [filters, setFilters] = useState<AppliedFilters>({});
  const [page, setPage] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] =
    useState<PageResponse<ManagedUserSummary> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadedRequestKey, setLoadedRequestKey] = useState<string | null>(null);

  const [academies, setAcademies] = useState<OrganizationOption[]>([]);
  const [clubs, setClubs] = useState<OrganizationOption[]>([]);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  const requestKey = `${page}:${JSON.stringify(filters)}:${reloadKey}`;
  const isLoading = loadedRequestKey !== requestKey;

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    const controller = new AbortController();
    let isActive = true;

    listUsers(
      {
        page,
        size: PAGE_SIZE,
        q: filters.q,
        role: filters.role,
        status: filters.status,
        academyId: filters.academyId,
        clubId: filters.clubId,
      },
      controller.signal,
    )
      .then((data) => {
        if (!isActive) {
          return;
        }

        setResult(data);
        setLoadError(null);
        setLoadedRequestKey(requestKey);

        if (data.content.length === 0 && data.page > 0) {
          setPage(Math.max(0, data.page - 1));
        }
      })
      .catch((error: unknown) => {
        if (!isActive || isAbortError(error)) {
          return;
        }

        if (error instanceof ApiError && error.status === 401) {
          markSessionExpired();
          return;
        }

        setResult(null);
        setLoadError(
          error instanceof Error
            ? error.message
            : "No se pudo cargar la lista de usuarios.",
        );
        setLoadedRequestKey(requestKey);
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [isAdmin, page, filters, reloadKey, requestKey, markSessionExpired]);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    const controller = new AbortController();
    let isActive = true;

    Promise.all([
      listOrganizationOptions("academy", false, controller.signal),
      listOrganizationOptions("club", false, controller.signal),
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
            : "No se pudieron cargar las organizaciones para filtrar.",
        );
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <UserAccessRestricted
        title="Usuarios"
        message="Solo un administrador puede listar, crear y administrar cuentas."
      />
    );
  }

  function handleApply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setFilters({
      q: qDraft.trim() || undefined,
      role: roleDraft || undefined,
      status: statusDraft || undefined,
      academyId: academyDraft ? Number(academyDraft) : undefined,
      clubId: clubDraft ? Number(clubDraft) : undefined,
    });
    setPage(0);
  }

  function handleReset() {
    setQDraft("");
    setRoleDraft("");
    setStatusDraft("");
    setAcademyDraft("");
    setClubDraft("");
    setFilters({});
    setPage(0);
  }

  const totalPages = result?.totalPages ?? 0;
  const totalElements = result?.totalElements ?? 0;
  const currentPage = result?.page ?? page;
  const hasPrevious = page > 0;
  const hasNext = totalPages > 0 && page + 1 < totalPages;
  const hasFilters = Object.values(filters).some(
    (value) => value !== undefined,
  );

  return (
    <div>
      <header className="pageHeader">
        <div>
          <p className="eyebrow">ADMINISTRACIÓN</p>
          <h1>Usuarios</h1>
          <p>
            Consulta y administra cuentas, roles y asignaciones por organización.
            Las cuentas se crean activas con una contraseña temporal que el
            sistema genera y solo se muestra una vez.
          </p>
        </div>
        <div className="toolbarActions">
          <Link className="button buttonPrimary" href={ADMIN_USER_CREATE_PATH}>
            Nuevo usuario
          </Link>
        </div>
      </header>

      <Alert variant="info" title="Solicitudes de ojeador">
        <p>
          Los ojeadores en estado pendiente se revisan en{" "}
          <Link href={SCOUT_REQUESTS_PATH}>Solicitudes de ojeador</Link>. Esta
          pantalla no aprueba ni rechaza solicitudes.
        </p>
      </Alert>

      {optionsError ? (
        <Alert variant="warning" title="Filtros de organización incompletos">
          <p>{optionsError}</p>
        </Alert>
      ) : null}

      <section className="card" aria-labelledby="user-filters-title">
        <h2 className="cardTitle" id="user-filters-title">
          Filtros
        </h2>
        <form onSubmit={handleApply}>
          <div className="filterGrid">
            <TextField
              label="Buscar"
              name="q"
              type="search"
              value={qDraft}
              onChange={(event) => setQDraft(event.target.value)}
              placeholder="Nombre, correo, usuario o documento"
              maxLength={100}
            />
            <SelectField
              label="Rol"
              name="role"
              value={roleDraft}
              onChange={(event) =>
                setRoleDraft(event.target.value as "" | UserRole)
              }
            >
              <option value="">Todos</option>
              {ROLE_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Estado"
              name="status"
              value={statusDraft}
              onChange={(event) =>
                setStatusDraft(event.target.value as "" | ManagedUserStatus)
              }
            >
              <option value="">Todos</option>
              <option value="ACTIVE">Activas</option>
              <option value="INACTIVE">Inhabilitadas</option>
            </SelectField>
            <SelectField
              label="Academia"
              name="academyId"
              value={academyDraft}
              onChange={(event) => {
                setAcademyDraft(event.target.value);
                if (event.target.value) {
                  setClubDraft("");
                }
              }}
            >
              <option value="">Todas</option>
              {academies.map((academy) => (
                <option key={academy.id} value={academy.id}>
                  {academy.name} ({academy.code})
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Club"
              name="clubId"
              value={clubDraft}
              onChange={(event) => {
                setClubDraft(event.target.value);
                if (event.target.value) {
                  setAcademyDraft("");
                }
              }}
            >
              <option value="">Todos</option>
              {clubs.map((club) => (
                <option key={club.id} value={club.id}>
                  {club.name} ({club.code})
                </option>
              ))}
            </SelectField>
            <div className="filterActions">
              <button
                className="button buttonPrimary buttonSmall"
                type="submit"
                disabled={isLoading}
              >
                Aplicar filtros
              </button>
              <button
                className="button buttonSecondary buttonSmall"
                type="button"
                onClick={handleReset}
                disabled={isLoading}
              >
                Limpiar
              </button>
            </div>
          </div>
        </form>
      </section>

      <section className="card tableCard" aria-labelledby="user-results-title">
        <div className="tableHeader">
          <h2 className="cardTitle" id="user-results-title">
            Cuentas registradas
          </h2>
          {result ? (
            <p className="tableCount">
              {totalElements} {totalElements === 1 ? "cuenta" : "cuentas"}
            </p>
          ) : null}
        </div>

        {isLoading ? (
          <InlineLoading message="Cargando usuarios…" />
        ) : loadError ? (
          <Alert variant="error" title="No se pudo cargar la lista">
            <p>{loadError}</p>
            <button
              className="linkButton"
              type="button"
              onClick={() => setReloadKey((current) => current + 1)}
            >
              Reintentar
            </button>
          </Alert>
        ) : !result || result.content.length === 0 ? (
          <StatePanel
            title={
              hasFilters
                ? "No hay usuarios con los filtros seleccionados"
                : "No hay usuarios para mostrar"
            }
            action={
              hasFilters ? (
                <button
                  className="button buttonSecondary buttonSmall"
                  type="button"
                  onClick={handleReset}
                >
                  Limpiar filtros
                </button>
              ) : (
                <Link
                  className="button buttonPrimary buttonSmall"
                  href={ADMIN_USER_CREATE_PATH}
                >
                  Crear el primer usuario
                </Link>
              )
            }
          >
            <p>
              {hasFilters
                ? "Ajusta la búsqueda, el rol, el estado o la organización."
                : "Las cuentas creadas desde administración aparecerán aquí."}
            </p>
          </StatePanel>
        ) : (
          <>
            <div className="tableWrap">
              <table className="dataTable">
                <caption className="srOnly">Usuarios registrados</caption>
                <thead>
                  <tr>
                    <th scope="col">Usuario</th>
                    <th scope="col">Rol</th>
                    <th scope="col">Organización</th>
                    <th scope="col">Estado</th>
                    <th scope="col">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {result.content.map((managedUser) => (
                    <tr key={managedUser.id}>
                      <td>
                        <span className="cellStrong">
                          {fullName(managedUser)}
                        </span>
                        <span className="cellMuted">{managedUser.email}</span>
                        <span className="cellMuted">
                          @{managedUser.username}
                        </span>
                      </td>
                      <td>{roleLabel(managedUser.role)}</td>
                      <td>
                        {userOrganizationLabel(managedUser)}
                        {userOrganizationCode(managedUser) ? (
                          <span className="cellMuted">
                            {userOrganizationCode(managedUser)}
                          </span>
                        ) : null}
                      </td>
                      <td>
                        <span
                          className={manageBadgeClass(managedUser.status)}
                        >
                          {managedStatusLabel(managedUser.status)}
                        </span>
                      </td>
                      <td>
                        <div className="rowActions">
                          <Link
                            className="button buttonSecondary buttonSmall"
                            href={adminUserDetailPath(managedUser.id)}
                          >
                            Ver
                          </Link>
                          {isPendingScout(managedUser) ? (
                            <Link
                              className="button buttonGhost buttonSmall"
                              href={SCOUT_REQUESTS_PATH}
                            >
                              Revisar solicitud
                            </Link>
                          ) : (
                            <Link
                              className="button buttonGhost buttonSmall"
                              href={adminUserEditPath(managedUser.id)}
                            >
                              Editar
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <p className="paginationInfo">
                Página {currentPage + 1} de {Math.max(totalPages, 1)}
              </p>
              <div className="paginationActions">
                <button
                  className="button buttonSecondary buttonSmall"
                  type="button"
                  onClick={() => setPage((current) => Math.max(0, current - 1))}
                  disabled={!hasPrevious || isLoading}
                >
                  Anterior
                </button>
                <button
                  className="button buttonSecondary buttonSmall"
                  type="button"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={!hasNext || isLoading}
                >
                  Siguiente
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      <p className="footnote">
        Tus permisos se verifican automáticamente en cada operación. Ocultar
        acciones en la interfaz no reemplaza esa verificación.
      </p>
    </div>
  );
}
