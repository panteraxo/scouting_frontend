"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { SelectField, TextField } from "@/components/ui/form-field";
import { InlineLoading, StatePanel } from "@/components/ui/loading";
import { useAuth } from "@/features/auth/auth-provider";
import { ApiError, isAbortError } from "@/lib/api-client";
import type {
  OperationalStatus,
  OrganizationKind,
  OrganizationResponse,
  PageResponse,
  VerificationStatus,
} from "@/types/api";
import {
  adminCreatePath,
  adminDetailPath,
  adminEditPath,
} from "../routes";
import {
  formatCount,
  kindPlural,
  kindThe,
  operationalBadgeClass,
  operationalStatusLabel,
  verificationBadgeClass,
  verificationLabel,
} from "../labels";
import { listAdminOrganizations } from "../organizations-api";
import { OrganizationAccessRestricted } from "./organization-access-restricted";
import { OrganizationLocationFilter } from "./organization-location-filter";
import { OrganizationLogo } from "./organization-logo";

const PAGE_SIZE = 10;

const SORT_OPTIONS = [
  { value: "createdAt,desc", label: "Más reciente" },
  { value: "name,asc", label: "Nombre" },
  { value: "code,asc", label: "Código" },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]["value"];

interface AppliedFilters {
  q?: string;
  type?: string;
  ubigeo?: string;
  operationalStatus?: OperationalStatus;
  verificationStatus?: VerificationStatus;
}

interface SummaryCounts {
  total: number | null;
  active: number | null;
  inactive: number | null;
}

const EMPTY_SUMMARY: SummaryCounts = {
  total: null,
  active: null,
  inactive: null,
};

export function AdminOrganizationList({
  kind,
}: {
  kind: OrganizationKind;
}) {
  const { user, markSessionExpired } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const isClub = kind === "club";

  const [qDraft, setQDraft] = useState("");
  const [departmentCode, setDepartmentCode] = useState("");
  const [provinceCode, setProvinceCode] = useState("");
  const [typeDraft, setTypeDraft] = useState("");
  const [verificationDraft, setVerificationDraft] = useState<
    "" | VerificationStatus
  >("");
  const [operationalDraft, setOperationalDraft] = useState<
    "" | OperationalStatus
  >("");
  const [filters, setFilters] = useState<AppliedFilters>({});
  const [sort, setSort] = useState<SortValue>("createdAt,desc");
  const [page, setPage] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] =
    useState<PageResponse<OrganizationResponse> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadedRequestKey, setLoadedRequestKey] = useState<string | null>(
    null,
  );
  const [summary, setSummary] = useState<SummaryCounts>(EMPTY_SUMMARY);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const resultsNoun = isClub ? "clubes" : "academias";
  const requestKey = `${kind}:${page}:${sort}:${JSON.stringify(filters)}:${reloadKey}`;
  const isLoading = loadedRequestKey !== requestKey;

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    const controller = new AbortController();
    let isActive = true;

    fetchList(kind, {
      page,
      filters,
      sort,
      signal: controller.signal,
    })
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
            : `No se pudieron cargar los ${resultsNoun}.`,
        );
        setLoadedRequestKey(requestKey);
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [
    isAdmin,
    kind,
    page,
    filters,
    sort,
    reloadKey,
    requestKey,
    resultsNoun,
    markSessionExpired,
  ]);

  useEffect(() => {
    if (!isAdmin || !isClub) {
      return;
    }

    const controller = new AbortController();
    let isActive = true;

    Promise.allSettled([
      listAdminOrganizations(
        kind,
        { page: 0, size: 1 },
        controller.signal,
      ),
      listAdminOrganizations(
        kind,
        { page: 0, size: 1, operationalStatus: "ACTIVE" },
        controller.signal,
      ),
      listAdminOrganizations(
        kind,
        { page: 0, size: 1, operationalStatus: "INACTIVE" },
        controller.signal,
      ),
    ]).then((responses) => {
      if (!isActive) {
        return;
      }

      const sessionExpired = responses.some(
        (response) =>
          response.status === "rejected" &&
          response.reason instanceof ApiError &&
          response.reason.status === 401,
      );

      if (sessionExpired) {
        setSummaryLoading(false);
        markSessionExpired();
        return;
      }

      setSummary({
        total: countFromResult(responses[0]),
        active: countFromResult(responses[1]),
        inactive: countFromResult(responses[2]),
      });
      setSummaryLoading(false);
    });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [isAdmin, isClub, kind, reloadKey, markSessionExpired]);

  if (!isAdmin) {
    return (
      <OrganizationAccessRestricted
        title={`Administración de ${kindPlural(kind)}`}
        message={`Solo un administrador puede gestionar ${kindPlural(kind)}.`}
      />
    );
  }

  function handleApply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setFilters({
      q: qDraft.trim() || undefined,
      type: typeDraft.trim() || undefined,
      ubigeo: provinceCode || departmentCode || undefined,
      verificationStatus: verificationDraft || undefined,
      operationalStatus: operationalDraft || undefined,
    });
    setPage(0);
  }

  const totalPages = result?.totalPages ?? 0;
  const totalElements = result?.totalElements ?? 0;
  const currentPage = result?.page ?? page;
  const pageSize = result?.size ?? PAGE_SIZE;
  const hasPrevious = page > 0;
  const hasNext = totalPages > 0 && page + 1 < totalPages;
  const hasFilters =
    Boolean(filters.q) ||
    Boolean(filters.type) ||
    Boolean(filters.ubigeo) ||
    Boolean(filters.verificationStatus) ||
    Boolean(filters.operationalStatus);
  const rangeStart =
    result && result.content.length > 0 ? currentPage * pageSize + 1 : 0;
  const rangeEnd = result ? currentPage * pageSize + result.content.length : 0;

  function statValue(value: number | null): string {
    return summaryLoading ? "…" : formatCount(value);
  }

  return (
    <div>
      <header className="pageHeader">
        <div>
          <p className="eyebrow">ADMINISTRACIÓN</p>
          <h1>{isClub ? "Clubes Deportivos" : "Academias"}</h1>
          <p>
            {isClub
              ? "Gestiona los clubes deportivos registrados en el sistema."
              : "Gestiona las academias registradas en el sistema."}
          </p>
        </div>
        <div className="toolbarActions">
          <Link
            className="button buttonPrimary"
            href={adminCreatePath(kind)}
          >
            {isClub ? "+ Agregar club" : "Nueva academia"}
          </Link>
        </div>
      </header>

      {isClub ? (
        <section
          className="orgStats"
          aria-label="Resumen de clubes"
          aria-busy={summaryLoading}
        >
          <div className="orgStatCard">
            <p className="orgStatLabel">Total de clubes</p>
            <p className="orgStatValue" aria-live="polite">
              {statValue(summary.total)}
            </p>
            <p className="orgStatHint">Registrados en el sistema</p>
          </div>
          <div className="orgStatCard">
            <p className="orgStatLabel">Clubes activos</p>
            <p className="orgStatValue" aria-live="polite">
              {statValue(summary.active)}
            </p>
            <p className="orgStatHint">Con estado operativo activo</p>
          </div>
          <div className="orgStatCard">
            <p className="orgStatLabel">Clubes inactivos</p>
            <p className="orgStatValue" aria-live="polite">
              {statValue(summary.inactive)}
            </p>
            <p className="orgStatHint">Inhabilitados por el Administrador</p>
          </div>
        </section>
      ) : null}

      <section className="card" aria-labelledby="admin-org-filters">
        <h2 className="cardTitle" id="admin-org-filters">
          Filtros
        </h2>
        <form onSubmit={handleApply}>
          <div className="orgFilterBar">
            <TextField
              label="Buscar"
              name="q"
              type="search"
              value={qDraft}
              onChange={(event) => setQDraft(event.target.value)}
              placeholder="Nombre o código"
            />

            <OrganizationLocationFilter
              departmentCode={departmentCode}
              provinceCode={provinceCode}
              onChange={(next) => {
                setDepartmentCode(next.departmentCode);
                setProvinceCode(next.provinceCode);
              }}
            />

            <SelectField
              label="Estado"
              name="operationalStatus"
              value={operationalDraft}
              onChange={(event) =>
                setOperationalDraft(
                  event.target.value as "" | OperationalStatus,
                )
              }
            >
              <option value="">Todos</option>
              <option value="ACTIVE">Activos</option>
              <option value="INACTIVE">Inactivos</option>
            </SelectField>
          </div>

          <div className="orgFilterSecondary">
            <div className="filterGrid">
              <TextField
                label="Tipo"
                name="type"
                value={typeDraft}
                onChange={(event) => setTypeDraft(event.target.value)}
                placeholder="Texto libre"
              />
              <SelectField
                label="Verificación"
                name="verificationStatus"
                value={verificationDraft}
                onChange={(event) =>
                  setVerificationDraft(
                    event.target.value as "" | VerificationStatus,
                  )
                }
              >
                <option value="">Todas</option>
                <option value="PENDING_VERIFICATION">
                  Pendiente de verificación
                </option>
                <option value="VERIFIED">Verificada</option>
                <option value="REJECTED">Rechazada</option>
              </SelectField>
              <div className="orgFilterActions">
                <button
                  className="button buttonPrimary buttonSmall"
                  type="submit"
                  disabled={isLoading}
                >
                  Buscar
                </button>
              </div>
            </div>
          </div>
        </form>
      </section>

      <section className="card tableCard" aria-labelledby="admin-org-results">
        <div className="orgResultsHeader">
          <div>
            <h2 className="cardTitle" id="admin-org-results">
              {isClub ? "Clubes registrados" : "Academias registradas"}
            </h2>
            {result && !isLoading ? (
              <p className="orgResultsCount">
                {result.content.length > 0
                  ? `Mostrando ${rangeStart}–${rangeEnd} de ${formatCount(
                      totalElements,
                    )} ${resultsNoun}`
                  : `Sin ${resultsNoun} para mostrar`}
              </p>
            ) : null}
          </div>
          <label className="orgSort">
            <span>Ordenar por:</span>
            <select
              className="select orgSortSelect"
              value={sort}
              onChange={(event) => {
                setSort(event.target.value as SortValue);
                setPage(0);
              }}
              aria-label="Ordenar resultados"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {isLoading ? (
          <InlineLoading message={`Cargando ${resultsNoun}…`} />
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
                ? "No hay resultados con los filtros seleccionados"
                : `No hay ${resultsNoun} para mostrar`
            }
            action={
              hasFilters ? undefined : (
                <Link
                  className="button buttonPrimary buttonSmall"
                  href={adminCreatePath(kind)}
                >
                  {isClub ? "Crear el primer club" : "Crear la primera academia"}
                </Link>
              )
            }
          >
            <p>
              {hasFilters
                ? "Ajusta la búsqueda o el estado para encontrar la organización."
                : `${kindThe(kind)} aparecerá aquí cuando se registre.`}
            </p>
          </StatePanel>
        ) : (
          <>
            <div className="tableWrap orgTableWrap">
              <table className="dataTable orgTable">
                <caption className="srOnly">
                  {isClub ? "Clubes" : "Academias"} registrados
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Logo</th>
                    <th scope="col">Código</th>
                    <th scope="col">
                      {isClub ? "Nombre del club" : "Nombre de la academia"}
                    </th>
                    <th scope="col">Ciudad/Departamento</th>
                    <th scope="col">Contacto principal</th>
                    <th scope="col">Estado</th>
                    <th scope="col">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {result.content.map((organization) => (
                    <tr key={organization.id}>
                      <td>
                        <OrganizationLogo
                          name={organization.name}
                          logoUrl={organization.logoUrl}
                        />
                      </td>
                      <td>
                        <span className="orgCode">{organization.code}</span>
                      </td>
                      <td>
                        <div className="orgCellName">
                          <span className="cellStrong">
                            {organization.name}
                          </span>
                          <span className="cellMuted">
                            {organization.type || "Tipo no registrado"}
                          </span>
                        </div>
                      </td>
                      <td>{formatCityDepartment(organization)}</td>
                      <td>
                        <div className="orgContact">
                          <span className="orgContactLine">
                            {organization.institutionalEmail || "—"}
                          </span>
                          <span className="orgContactLine orgContactMuted">
                            {organization.institutionalPhone || "—"}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="orgBadges">
                          <span
                            className={operationalBadgeClass(
                              organization.operationalStatus,
                            )}
                          >
                            {operationalStatusLabel(
                              organization.operationalStatus,
                            )}
                          </span>
                          {isClub ? (
                            <span
                              className={`${verificationBadgeClass(
                                organization.verificationStatus,
                              )} statusBadgeSmall`}
                            >
                              {verificationLabel(
                                organization.verificationStatus,
                              )}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td>
                        <div className="orgTableActions">
                          <Link
                            className="button buttonSecondary buttonSmall"
                            href={adminDetailPath(kind, organization.id)}
                            aria-label={`Ver ${organization.name}`}
                          >
                            Ver
                          </Link>
                          <Link
                            className="button buttonGhost buttonSmall"
                            href={adminEditPath(kind, organization.id)}
                            aria-label={`Editar ${organization.name}`}
                          >
                            Editar
                          </Link>
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
        Tus permisos de Administrador se verifican automáticamente en cada
        operación; ocultar acciones en la interfaz no reemplaza esa verificación.
      </p>
    </div>
  );
}

function formatCityDepartment(organization: OrganizationResponse): string {
  const parts = [organization.provinceName, organization.departmentName]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));

  if (parts.length > 0) {
    return parts.join(", ");
  }

  return organization.ubigeoCode?.trim() || "—";
}

function countFromResult(
  result: PromiseSettledResult<PageResponse<OrganizationResponse>> | undefined,
): number | null {
  return result && result.status === "fulfilled"
    ? result.value.totalElements
    : null;
}

async function fetchList(
  kind: OrganizationKind,
  options: {
    page: number;
    filters: AppliedFilters;
    sort: SortValue;
    signal: AbortSignal;
  },
): Promise<PageResponse<OrganizationResponse>> {
  return listAdminOrganizations(
    kind,
    {
      page: options.page,
      size: PAGE_SIZE,
      sort: options.sort,
      q: options.filters.q,
      type: options.filters.type,
      ubigeo: options.filters.ubigeo,
      verificationStatus: options.filters.verificationStatus,
      operationalStatus: options.filters.operationalStatus,
    },
    options.signal,
  );
}
