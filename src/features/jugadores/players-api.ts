import { apiMutation, apiRequest } from "@/lib/api-client";
import {
  listAdminOrganizations,
  listDirectoryOrganizations,
} from "@/features/organizations/organizations-api";
import type {
  GuardianConsentUpdateInput,
  PageResponse,
  PlayerAccountCandidate,
  PlayerAccountCandidateQuery,
  PlayerAccountCreatedResponse,
  PlayerAccountCreateInput,
  PlayerAdminDetailResponse,
  PlayerCreateInput,
  PlayerDetailResponse,
  PlayerDirectoryItem,
  PlayerGuardianScoutResponse,
  PlayerGuardianStaffResponse,
  PlayerGuardianUpsertInput,
  PlayerHistoryCorrectionInput,
  PlayerHistoryEntryResponse,
  PlayerHistoryInput,
  PlayerHistoryQuery,
  PlayerListQuery,
  PlayerOperationalStatus,
  PlayerOwnResponse,
  PlayerStats,
  PlayerStatusInput,
  PlayerUpdateInput,
  UserRole,
} from "@/types/api";
import {
  MY_PLAYER_API,
  PLAYERS_API,
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

export function listPlayers(
  query: PlayerListQuery,
  signal?: AbortSignal,
): Promise<PageResponse<PlayerDirectoryItem>> {
  return apiRequest<PageResponse<PlayerDirectoryItem>>(
    `${PLAYERS_API}${toQueryString({
      page: query.page,
      size: query.size,
      sort: query.sort,
      q: query.q,
      position: query.position,
      positionGroup: query.positionGroup,
      ageMin: query.ageMin,
      ageMax: query.ageMax,
      regionCode: query.regionCode,
      provinceCode: query.provinceCode,
      districtCode: query.districtCode,
      academyId: query.academyId,
      operationalStatus: query.operationalStatus,
      profileStatus: query.profileStatus,
    })}`,
    { method: "GET", signal },
  );
}

export function listPlayerAccountCandidates(
  query: PlayerAccountCandidateQuery,
  signal?: AbortSignal,
): Promise<PageResponse<PlayerAccountCandidate>> {
  return apiRequest<PageResponse<PlayerAccountCandidate>>(
    `${PLAYERS_API}/account-candidates${toQueryString({
      page: query.page,
      size: query.size,
      sort: query.sort,
      q: query.q,
      academyId: query.academyId,
    })}`,
    { method: "GET", signal },
  );
}

export function getPlayer(
  id: number,
  signal?: AbortSignal,
): Promise<PlayerDetailResponse> {
  return apiRequest<PlayerDetailResponse>(`${PLAYERS_API}/${id}`, {
    method: "GET",
    signal,
  });
}

export function getMyPlayer(signal?: AbortSignal): Promise<PlayerOwnResponse> {
  return apiRequest<PlayerOwnResponse>(MY_PLAYER_API, {
    method: "GET",
    signal,
  });
}

export function createPlayer(
  input: PlayerCreateInput,
): Promise<PlayerAdminDetailResponse | PlayerDetailResponse | undefined> {
  return apiMutation<PlayerDetailResponse | undefined>(PLAYERS_API, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/**
 * Crea la cuenta PLAYER y su perfil deportivo en una sola transacción. La
 * respuesta incluye la contraseña temporal, que solo se muestra una vez.
 */
export function createPlayerWithAccount(
  input: PlayerAccountCreateInput,
): Promise<PlayerAccountCreatedResponse> {
  return apiMutation<PlayerAccountCreatedResponse>(
    `${PLAYERS_API}/with-account`,
    { method: "POST", body: JSON.stringify(input) },
  );
}

export function updatePlayer(
  id: number,
  input: PlayerUpdateInput,
): Promise<PlayerDetailResponse | undefined> {
  return apiMutation<PlayerDetailResponse | undefined>(
    `${PLAYERS_API}/${id}`,
    { method: "PUT", body: JSON.stringify(input) },
  );
}

export function updatePlayerStatus(
  id: number,
  status: PlayerOperationalStatus,
): Promise<PlayerDetailResponse | undefined> {
  const body: PlayerStatusInput = { status };
  return apiMutation<PlayerDetailResponse | undefined>(
    `${PLAYERS_API}/${id}/status`,
    { method: "PATCH", body: JSON.stringify(body) },
  );
}

export function getPlayerGuardian(
  playerId: number,
  signal?: AbortSignal,
): Promise<PlayerGuardianStaffResponse | PlayerGuardianScoutResponse> {
  return apiRequest<
    PlayerGuardianStaffResponse | PlayerGuardianScoutResponse
  >(`${PLAYERS_API}/${playerId}/guardian`, { method: "GET", signal });
}

export function upsertPlayerGuardian(
  playerId: number,
  input: PlayerGuardianUpsertInput,
): Promise<PlayerGuardianStaffResponse | undefined> {
  return apiMutation<PlayerGuardianStaffResponse | undefined>(
    `${PLAYERS_API}/${playerId}/guardian`,
    { method: "PUT", body: JSON.stringify(input) },
  );
}

export function updateGuardianConsent(
  playerId: number,
  input: GuardianConsentUpdateInput,
): Promise<PlayerGuardianStaffResponse | undefined> {
  return apiMutation<PlayerGuardianStaffResponse | undefined>(
    `${PLAYERS_API}/${playerId}/guardian/consent`,
    { method: "PUT", body: JSON.stringify(input) },
  );
}

export function listPlayerHistory(
  playerId: number,
  query: PlayerHistoryQuery,
  signal?: AbortSignal,
): Promise<PageResponse<PlayerHistoryEntryResponse>> {
  return apiRequest<PageResponse<PlayerHistoryEntryResponse>>(
    `${PLAYERS_API}/${playerId}/history${toQueryString({
      page: query.page,
      size: query.size,
      sort: query.sort,
      activityType: query.activityType,
      competitiveLevel: query.competitiveLevel,
      ageCategory: query.ageCategory,
      position: query.position,
      year: query.year,
      from: query.from,
      to: query.to,
    })}`,
    { method: "GET", signal },
  );
}

export function getPlayerHistory(
  playerId: number,
  historyId: number,
  signal?: AbortSignal,
): Promise<PlayerHistoryEntryResponse> {
  return apiRequest<PlayerHistoryEntryResponse>(
    `${PLAYERS_API}/${playerId}/history/${historyId}`,
    { method: "GET", signal },
  );
}

export function createPlayerHistory(
  playerId: number,
  input: PlayerHistoryInput,
): Promise<PlayerHistoryEntryResponse | undefined> {
  return apiMutation<PlayerHistoryEntryResponse | undefined>(
    `${PLAYERS_API}/${playerId}/history`,
    { method: "POST", body: JSON.stringify(input) },
  );
}

export function correctPlayerHistory(
  playerId: number,
  historyId: number,
  input: PlayerHistoryCorrectionInput,
): Promise<PlayerHistoryEntryResponse | undefined> {
  return apiMutation<PlayerHistoryEntryResponse | undefined>(
    `${PLAYERS_API}/${playerId}/history/${historyId}`,
    { method: "PUT", body: JSON.stringify(input) },
  );
}

export function getPlayerStats(
  playerId: number,
  signal?: AbortSignal,
): Promise<PlayerStats> {
  return apiRequest<PlayerStats>(`${PLAYERS_API}/${playerId}/stats`, {
    method: "GET",
    signal,
  });
}

export interface PlayerAcademyOption {
  id: number;
  name: string;
  code: string;
  operationalStatus: "ACTIVE" | "INACTIVE";
  verificationStatus?: "PENDING_VERIFICATION" | "VERIFIED" | "REJECTED";
}

/**
 * Opciones de academia para filtros. ADMIN puede incluir inactivas; SCOUT usa
 * el módulo de academias (solo activas y verificadas), que es el único listado al que
 * tiene acceso.
 */
export async function listPlayerAcademyOptions(
  role: UserRole,
  activeOnly: boolean,
  signal?: AbortSignal,
): Promise<PlayerAcademyOption[]> {
  if (role !== "ADMIN" && role !== "SCOUT") {
    return [];
  }

  const options: PlayerAcademyOption[] = [];
  let page = 0;
  let totalPages = 1;

  while (page < totalPages) {
    if (role === "ADMIN") {
      const result = await listAdminOrganizations(
        "academy",
        {
          page,
          size: 100,
          sort: "name,asc",
          operationalStatus: activeOnly ? "ACTIVE" : undefined,
        },
        signal,
      );

      options.push(
        ...result.content.map((academy) => ({
          id: academy.id,
          name: academy.name,
          code: academy.code,
          operationalStatus: academy.operationalStatus,
          verificationStatus: academy.verificationStatus,
        })),
      );
      totalPages = result.totalPages;
    } else {
      const result = await listDirectoryOrganizations(
        "academy",
        { page, size: 100, sort: "name,asc" },
        signal,
      );

      options.push(
        ...result.content.map((academy) => ({
          id: academy.id,
          name: academy.name,
          code: academy.code,
          operationalStatus: "ACTIVE" as const,
        })),
      );
      totalPages = result.totalPages;
    }

    page += 1;
  }

  return options;
}
