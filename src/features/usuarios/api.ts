import { apiMutation, apiRequest } from "@/lib/api-client";
import { listAdminOrganizations } from "@/features/organizations/organizations-api";
import type {
  CreateUserResult,
  ManagedUser,
  ManagedUserStatus,
  ManagedUserSummary,
  OrganizationKind,
  PageResponse,
  TemporaryPasswordResult,
  UserAssignmentInput,
  UserCreateInput,
  UserIdentityInput,
  UserListQuery,
} from "@/types/api";
import { ADMIN_USERS_API, SCOPED_USERS_API } from "./routes";

type QueryValue = string | number | null | undefined;

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

export interface OrganizationOption {
  id: number;
  name: string;
  code: string;
  operationalStatus: "ACTIVE" | "INACTIVE";
}

export function listUsers(
  query: UserListQuery,
  signal?: AbortSignal,
): Promise<PageResponse<ManagedUserSummary>> {
  return apiRequest<PageResponse<ManagedUserSummary>>(
    `${ADMIN_USERS_API}${toQueryString({
      page: query.page,
      size: query.size,
      sort: query.sort,
      q: query.q,
      role: query.role,
      status: query.status,
      academyId: query.academyId,
      clubId: query.clubId,
    })}`,
    { method: "GET", signal },
  );
}

export function getAdminUser(
  id: number,
  signal?: AbortSignal,
): Promise<ManagedUser> {
  return apiRequest<ManagedUser>(`${ADMIN_USERS_API}/${id}`, {
    method: "GET",
    signal,
  });
}

export function createAdminUser(
  input: UserCreateInput,
): Promise<CreateUserResult> {
  return apiMutation<CreateUserResult>(ADMIN_USERS_API, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/**
 * Alta dentro de la academia del Profesor o Director autenticado. El request no
 * incluye `academyId`: el servidor la obtiene del contexto de seguridad.
 */
export function createScopedUser(
  input: UserCreateInput,
): Promise<CreateUserResult> {
  return apiMutation<CreateUserResult>(SCOPED_USERS_API, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateUserIdentity(
  id: number,
  input: UserIdentityInput,
): Promise<ManagedUser | undefined> {
  return apiMutation<ManagedUser | undefined>(`${ADMIN_USERS_API}/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function updateUserAssignment(
  id: number,
  input: UserAssignmentInput,
): Promise<ManagedUser | undefined> {
  return apiMutation<ManagedUser | undefined>(
    `${ADMIN_USERS_API}/${id}/assignment`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
}

export function updateUserStatus(
  id: number,
  status: ManagedUserStatus,
): Promise<ManagedUser | undefined> {
  return apiMutation<ManagedUser | undefined>(
    `${ADMIN_USERS_API}/${id}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
  );
}

export function resetUserPassword(
  id: number,
): Promise<TemporaryPasswordResult> {
  return apiMutation<TemporaryPasswordResult>(
    `${ADMIN_USERS_API}/${id}/reset-password`,
    { method: "POST" },
  );
}

/**
 * Opciones para los selectores de organización. Usa los listados
 * administrativos existentes de SCP-003. En creación solo se ofrecen
 * organizaciones activas; en filtros se incluyen todas para poder encontrar
 * cuentas históricas.
 */
export async function listOrganizationOptions(
  kind: OrganizationKind,
  activeOnly: boolean,
  signal?: AbortSignal,
): Promise<OrganizationOption[]> {
  const options: OrganizationOption[] = [];
  let page = 0;
  let totalPages = 1;

  while (page < totalPages) {
    const result = await listAdminOrganizations(
      kind,
      {
        page,
        size: 100,
        sort: "name,asc",
        operationalStatus: activeOnly ? "ACTIVE" : undefined,
      },
      signal,
    );

    options.push(
      ...result.content.map((organization) => ({
        id: organization.id,
        name: organization.name,
        code: organization.code,
        operationalStatus: organization.operationalStatus,
      })),
    );

    totalPages = result.totalPages;
    page += 1;
  }

  return options;
}
