import { apiMutation, apiRequest } from "@/lib/api-client";
import type {
  AcademyDirectoryResponse,
  ClubDirectoryResponse,
  DirectoryQuery,
  OrganizationDirectoryResponse,
  OrganizationInput,
  OrganizationKind,
  OrganizationListQuery,
  OrganizationResponse,
  PageResponse,
  UbigeoOption,
  VerificationTargetStatus,
} from "@/types/api";
import {
  ADMIN_ORGANIZATION_API,
  DIRECTORY_ORGANIZATION_API,
  OWN_ORGANIZATION_API,
} from "./routes";

type QueryValue = string | number | boolean | null | undefined;

function toQueryString(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    search.set(key, String(value));
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

function buildListQuery(query: OrganizationListQuery | DirectoryQuery) {
  return toQueryString({
    page: query.page,
    size: query.size,
    sort: query.sort,
    q: query.q,
    type: query.type,
    ubigeo: query.ubigeo,
    operationalStatus:
      "operationalStatus" in query ? query.operationalStatus : undefined,
    verificationStatus:
      "verificationStatus" in query ? query.verificationStatus : undefined,
  });
}

/* -------------------------------------------------------------------------- */
/* Administración                                                              */
/* -------------------------------------------------------------------------- */

export function listAdminOrganizations(
  kind: OrganizationKind,
  query: OrganizationListQuery,
  signal?: AbortSignal,
): Promise<PageResponse<OrganizationResponse>> {
  return apiRequest<PageResponse<OrganizationResponse>>(
    `${ADMIN_ORGANIZATION_API[kind]}${buildListQuery(query)}`,
    { method: "GET", signal },
  );
}

export function createAdminOrganization(
  kind: OrganizationKind,
  input: OrganizationInput,
): Promise<OrganizationResponse | undefined> {
  return apiMutation<OrganizationResponse | undefined>(
    ADMIN_ORGANIZATION_API[kind],
    { method: "POST", body: JSON.stringify(input) },
  );
}

export function getAdminOrganization(
  kind: OrganizationKind,
  id: number,
  signal?: AbortSignal,
): Promise<OrganizationResponse> {
  return apiRequest<OrganizationResponse>(
    `${ADMIN_ORGANIZATION_API[kind]}/${id}`,
    { method: "GET", signal },
  );
}

export function updateAdminOrganization(
  kind: OrganizationKind,
  id: number,
  input: OrganizationInput,
): Promise<OrganizationResponse | undefined> {
  return apiMutation<OrganizationResponse | undefined>(
    `${ADMIN_ORGANIZATION_API[kind]}/${id}`,
    { method: "PUT", body: JSON.stringify(input) },
  );
}

export function setAdminOrganizationActive(
  kind: OrganizationKind,
  id: number,
  nextActive: boolean,
): Promise<OrganizationResponse | undefined> {
  return apiMutation<OrganizationResponse | undefined>(
    `${ADMIN_ORGANIZATION_API[kind]}/${id}/${
      nextActive ? "reactivate" : "deactivate"
    }`,
    { method: "PATCH" },
  );
}

export function changeOrganizationVerification(
  kind: OrganizationKind,
  id: number,
  status: VerificationTargetStatus,
): Promise<OrganizationResponse | undefined> {
  return apiMutation<OrganizationResponse | undefined>(
    `${ADMIN_ORGANIZATION_API[kind]}/${id}/verification`,
    { method: "PATCH", body: JSON.stringify({ status }) },
  );
}

/* -------------------------------------------------------------------------- */
/* Organización propia (Director de academia / Profesor / Responsable de club) */
/* -------------------------------------------------------------------------- */

export function getOwnOrganization(
  kind: OrganizationKind,
  signal?: AbortSignal,
): Promise<OrganizationResponse> {
  return apiRequest<OrganizationResponse>(
    `${OWN_ORGANIZATION_API[kind]}/me`,
    { method: "GET", signal },
  );
}

export function updateOwnOrganization(
  kind: OrganizationKind,
  input: OrganizationInput,
): Promise<OrganizationResponse | undefined> {
  return apiMutation<OrganizationResponse | undefined>(
    `${OWN_ORGANIZATION_API[kind]}/me`,
    { method: "PUT", body: JSON.stringify(input) },
  );
}

export function deactivateOwnOrganization(
  kind: OrganizationKind,
): Promise<OrganizationResponse | undefined> {
  return apiMutation<OrganizationResponse | undefined>(
    `${OWN_ORGANIZATION_API[kind]}/me/deactivate`,
    { method: "PATCH" },
  );
}

/* -------------------------------------------------------------------------- */
/* Vistas de solo lectura para ojeadores                                    */
/* -------------------------------------------------------------------------- */

export function listDirectoryOrganizations(
  kind: "academy",
  query: DirectoryQuery,
  signal?: AbortSignal,
): Promise<PageResponse<AcademyDirectoryResponse>>;
export function listDirectoryOrganizations(
  kind: "club",
  query: DirectoryQuery,
  signal?: AbortSignal,
): Promise<PageResponse<ClubDirectoryResponse>>;
export function listDirectoryOrganizations(
  kind: OrganizationKind,
  query: DirectoryQuery,
  signal?: AbortSignal,
): Promise<PageResponse<OrganizationDirectoryResponse>>;
export function listDirectoryOrganizations(
  kind: OrganizationKind,
  query: DirectoryQuery,
  signal?: AbortSignal,
): Promise<PageResponse<OrganizationDirectoryResponse>> {
  return apiRequest<PageResponse<OrganizationDirectoryResponse>>(
    `${DIRECTORY_ORGANIZATION_API[kind]}${buildListQuery(query)}`,
    { method: "GET", signal },
  );
}

export function getDirectoryOrganization(
  kind: "academy",
  id: number,
  signal?: AbortSignal,
): Promise<AcademyDirectoryResponse>;
export function getDirectoryOrganization(
  kind: "club",
  id: number,
  signal?: AbortSignal,
): Promise<ClubDirectoryResponse>;
export function getDirectoryOrganization(
  kind: OrganizationKind,
  id: number,
  signal?: AbortSignal,
): Promise<OrganizationDirectoryResponse>;
export function getDirectoryOrganization(
  kind: OrganizationKind,
  id: number,
  signal?: AbortSignal,
): Promise<OrganizationDirectoryResponse> {
  return apiRequest<OrganizationDirectoryResponse>(
    `${DIRECTORY_ORGANIZATION_API[kind]}/${id}`,
    { method: "GET", signal },
  );
}

/* -------------------------------------------------------------------------- */
/* Catálogo UBIGEO (INEI)                                                      */
/* -------------------------------------------------------------------------- */

export function listDepartments(
  signal?: AbortSignal,
): Promise<UbigeoOption[]> {
  return apiRequest<UbigeoOption[]>("/ubigeo/departments", {
    method: "GET",
    signal,
  });
}

export function listProvinces(
  departmentCode: string,
  signal?: AbortSignal,
): Promise<UbigeoOption[]> {
  return apiRequest<UbigeoOption[]>(
    `/ubigeo/provinces${toQueryString({ departmentCode })}`,
    { method: "GET", signal },
  );
}

export function listDistricts(
  provinceCode: string,
  signal?: AbortSignal,
): Promise<UbigeoOption[]> {
  return apiRequest<UbigeoOption[]>(
    `/ubigeo/districts${toQueryString({ provinceCode })}`,
    { method: "GET", signal },
  );
}
