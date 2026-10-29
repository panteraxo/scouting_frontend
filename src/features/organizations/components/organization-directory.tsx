"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { SelectField, TextField } from "@/components/ui/form-field";
import { InlineLoading, StatePanel } from "@/components/ui/loading";
import { useAuth } from "@/features/auth/auth-provider";
import { ApiError, isAbortError } from "@/lib/api-client";
import type {
  DirectoryQuery,
  OrganizationDirectoryResponse,
  OrganizationKind,
  PageResponse,
  UbigeoOption,
} from "@/types/api";
import {
  listDepartments,
  listDistricts,
  listDirectoryOrganizations,
  listProvinces,
} from "../organizations-api";
import { readOnlyDetailPath } from "../routes";
import { OrganizationAccessRestricted } from "./organization-access-restricted";
import { OrganizationLogo } from "./organization-logo";

const PAGE_SIZE = 12;

export function OrganizationDirectory({
  kind,
}: {
  kind: OrganizationKind;
}) {
  const { user, markSessionExpired } = useAuth();
  const canRead = user?.role === "ADMIN" || user?.role === "SCOUT";
  const isAcademy = kind === "academy";
  const noun = isAcademy ? "academia" : "club";
  const plural = isAcademy ? "academias" : "clubes";
  const activeLabel = isAcademy ? "activas y verificadas" : "activos y verificados";

  const [qDraft, setQDraft] = useState("");
  const [typeDraft, setTypeDraft] = useState("");
  const [departmentDraft, setDepartmentDraft] = useState("");
  const [provinceDraft, setProvinceDraft] = useState("");
  const [districtDraft, setDistrictDraft] = useState("");
  const [filters, setFilters] = useState<{
    q?: string;
    type?: string;
    ubigeo?: string;
  }>({});
  const [page, setPage] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] =
    useState<PageResponse<OrganizationDirectoryResponse> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [departments, setDepartments] = useState<UbigeoOption[]>([]);
  const [provincesData, setProvincesData] = useState<{
    code: string;
    items: UbigeoOption[];
  } | null>(null);
  const [districtsData, setDistrictsData] = useState<{
    code: string;
    items: UbigeoOption[];
  } | null>(null);
  const [loadedRequestKey, setLoadedRequestKey] = useState<string | null>(
    null,
  );

  const provinces =
    provincesData?.code === departmentDraft ? provincesData.items : [];
  const districts =
    districtsData?.code === provinceDraft ? districtsData.items : [];
  const requestKey = `${kind}:${page}:${JSON.stringify(filters)}:${reloadKey}`;
  const isLoading = loadedRequestKey !== requestKey;

  useEffect(() => {
    if (!canRead) {
      return;
    }

    const controller = new AbortController();
    let isActive = true;

    listDepartments(controller.signal)
      .then((data) => {
        if (isActive) {
          setDepartments(data);
        }
      })
      .catch((error: unknown) => {
        if (!isActive || isAbortError(error)) {
          return;
        }

        if (error instanceof ApiError && error.status === 401) {
          markSessionExpired();
        }
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [canRead, markSessionExpired]);

  useEffect(() => {
    if (!canRead || !departmentDraft) {
      return;
    }

    const controller = new AbortController();
    let isActive = true;

    listProvinces(departmentDraft, controller.signal)
      .then((data) => {
        if (isActive) {
          setProvincesData({ code: departmentDraft, items: data });
        }
      })
      .catch((error: unknown) => {
        if (!isActive || isAbortError(error)) {
          return;
        }

        if (error instanceof ApiError && error.status === 401) {
          markSessionExpired();
        }
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [canRead, departmentDraft, markSessionExpired]);

  useEffect(() => {
    if (!canRead || !provinceDraft) {
      return;
    }

    const controller = new AbortController();
    let isActive = true;

    listDistricts(provinceDraft, controller.signal)
      .then((data) => {
        if (isActive) {
          setDistrictsData({ code: provinceDraft, items: data });
        }
      })
      .catch((error: unknown) => {
        if (!isActive || isAbortError(error)) {
          return;
        }

        if (error instanceof ApiError && error.status === 401) {
          markSessionExpired();
        }
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [canRead, provinceDraft, markSessionExpired]);

  useEffect(() => {
    if (!canRead) {
      return;
    }

    const controller = new AbortController();
    let isActive = true;

    const query: DirectoryQuery = {
      page,
      size: PAGE_SIZE,
      q: filters.q,
      type: filters.type,
      ubigeo: filters.ubigeo,
    };

    listDirectoryOrganizations(kind, query, controller.signal)
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
            : "No se pudo cargar el listado.",
        );
        setLoadedRequestKey(requestKey);
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [
    canRead,
    kind,
    page,
    filters,
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

  function handleApply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ubigeo = districtDraft || provinceDraft || departmentDraft;

    setFilters({
      q: qDraft.trim() || undefined,
      type: typeDraft.trim() || undefined,
      ubigeo: ubigeo || undefined,
    });
    setPage(0);
  }

  function handleReset() {
    setQDraft("");
    setTypeDraft("");
    setDepartmentDraft("");
    setProvinceDraft("");
    setDistrictDraft("");
    setFilters({});
    setPage(0);
  }

  const totalPages = result?.totalPages ?? 0;
  const totalElements = result?.totalElements ?? 0;
  const currentPage = result?.page ?? page;
  const hasPrevious = page > 0;
  const hasNext = totalPages > 0 && page + 1 < totalPages;
  const hasFilters =
    Boolean(filters.q) ||
    Boolean(filters.type) ||
    Boolean(filters.ubigeo);

  return (
    <div>
      <header className="pageHeader">
        <div>
          <p className="eyebrow">{isAcademy ? "ACADEMIAS" : "CLUBES"}</p>
          <h1>{isAcademy ? "Academias" : "Clubes"}</h1>
          <p>
            Consulta {plural} {activeLabel}. La información es institucional y
            de solo lectura; no se muestran datos personales de representantes
            ni información interna.
          </p>
        </div>
        <button
          className="button buttonSecondary buttonSmall"
          type="button"
          onClick={() => setReloadKey((current) => current + 1)}
          disabled={isLoading}
        >
          Actualizar
        </button>
      </header>

      <section className="card" aria-labelledby="org-filters">
        <h2 className="cardTitle" id="org-filters">
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
              placeholder="Nombre o código"
            />
            <TextField
              label="Tipo"
              name="type"
              value={typeDraft}
              onChange={(event) => setTypeDraft(event.target.value)}
              placeholder="Texto libre"
            />
            <SelectField
              label="Departamento"
              name="ubigeoDepartment"
              value={departmentDraft}
              onChange={(event) => {
                setDepartmentDraft(event.target.value);
                setProvinceDraft("");
                setDistrictDraft("");
              }}
            >
              <option value="">Todos los departamentos</option>
              {departments.map((department) => (
                <option key={department.code} value={department.code}>
                  {department.name}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Provincia"
              name="ubigeoProvince"
              value={provinceDraft}
              onChange={(event) => {
                setProvinceDraft(event.target.value);
                setDistrictDraft("");
              }}
              disabled={!departmentDraft}
            >
              <option value="">
                {departmentDraft
                  ? "Todas las provincias"
                  : "Primero selecciona un departamento"}
              </option>
              {provinces.map((province) => (
                <option key={province.code} value={province.code}>
                  {province.name}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Distrito"
              name="ubigeoDistrict"
              value={districtDraft}
              onChange={(event) => setDistrictDraft(event.target.value)}
              disabled={!provinceDraft}
            >
              <option value="">
                {provinceDraft
                  ? "Todos los distritos"
                  : "Primero selecciona una provincia"}
              </option>
              {districts.map((district) => (
                <option key={district.code} value={district.code}>
                  {district.name}
                </option>
              ))}
            </SelectField>
            <div className="filterActions">
              <button
                className="button buttonPrimary buttonSmall"
                type="submit"
                disabled={isLoading}
              >
                Buscar
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
        <p className="footnote">
          El listado muestra solo organizaciones activas y verificadas. Puedes
          filtrar por departamento, provincia o distrito.
        </p>
      </section>

      <section className="sectionSpacer" aria-labelledby="org-results">
        <div className="tableHeader">
          <h2 className="cardTitle" id="org-results">
            Resultados
          </h2>
          {result ? (
            <p className="tableCount">
              {totalElements} {totalElements === 1 ? noun : plural}
            </p>
          ) : null}
        </div>

        {isLoading ? (
          <InlineLoading message={`Cargando ${plural}…`} />
        ) : loadError ? (
          <Alert variant="error" title="No se pudo cargar el listado">
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
                ? "No se encontraron organizaciones"
                : `No hay ${plural} para consultar`
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
              ) : undefined
            }
          >
            <p>
              {hasFilters
                ? "Prueba con otro texto, tipo o ubicación. Solo aparecen organizaciones activas y verificadas."
                : `Aún no hay ${plural} ${activeLabel} para consultar.`}
            </p>
          </StatePanel>
        ) : (
          <>
            <div className="tableWrap orgTableWrap">
              <table className="dataTable orgTable">
                <caption className="srOnly">
                  {isAcademy ? "Academias" : "Clubes"} {activeLabel}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Logo</th>
                    <th scope="col">Código</th>
                    <th scope="col">Nombre</th>
                    <th scope="col">Tipo</th>
                    <th scope="col">Ciudad/Departamento</th>
                    <th scope="col">Contacto principal</th>
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
                        <span className="cellStrong">{organization.name}</span>
                      </td>
                      <td>{organization.type || "Tipo no registrado"}</td>
                      <td>{formatProvinceDepartment(organization)}</td>
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
                        <div className="orgTableActions">
                          <Link
                            className="button buttonSecondary buttonSmall"
                            href={readOnlyDetailPath(kind, organization.id)}
                            aria-label={`Ver detalle de ${organization.name}`}
                          >
                            Ver detalle
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
        Consulta de solo lectura. No se muestran RUC, representantes ni contactos
        personales. La organización debe estar activa y verificada para aparecer.
      </p>
    </div>
  );
}

function formatProvinceDepartment(
  organization: OrganizationDirectoryResponse,
): string {
  const parts = [organization.provinceName, organization.departmentName]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));

  if (parts.length > 0) {
    return parts.join(", ");
  }

  return organization.ubigeoCode?.trim() || "—";
}
