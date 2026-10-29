import { apiMutation, apiRequest } from "@/lib/api-client";
import type {
  PageResponse,
  ProspectCreateInput,
  ProspectEvaluation,
  ProspectEvaluationInput,
  ProspectEvaluationQuery,
  ProspectListQuery,
  ProspectNotesUpdateInput,
  ProspectResponse,
  ProspectStatusUpdateInput,
} from "@/types/api";
import { PROSPECTS_API } from "./routes";

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

export function listProspects(
  query: ProspectListQuery,
  signal?: AbortSignal,
): Promise<PageResponse<ProspectResponse>> {
  return apiRequest<PageResponse<ProspectResponse>>(
    `${PROSPECTS_API}${toQueryString({
      page: query.page,
      size: query.size,
      sort: query.sort,
      status: query.status,
      playerId: query.playerId,
      q: query.q,
    })}`,
    { method: "GET", signal },
  );
}

export async function findProspectForPlayer(
  playerId: number,
  signal?: AbortSignal,
): Promise<ProspectResponse | null> {
  const result = await listProspects(
    { page: 0, size: 1, playerId, sort: "lastActivityAt,desc" },
    signal,
  );

  return result.content[0] ?? null;
}

export function getProspect(
  id: number,
  signal?: AbortSignal,
): Promise<ProspectResponse> {
  return apiRequest<ProspectResponse>(`${PROSPECTS_API}/${id}`, {
    method: "GET",
    signal,
  });
}

export function createProspect(
  input: ProspectCreateInput,
): Promise<ProspectResponse | undefined> {
  return apiMutation<ProspectResponse | undefined>(PROSPECTS_API, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateProspectNotes(
  id: number,
  input: ProspectNotesUpdateInput,
): Promise<ProspectResponse | undefined> {
  return apiMutation<ProspectResponse | undefined>(
    `${PROSPECTS_API}/${id}`,
    { method: "PATCH", body: JSON.stringify(input) },
  );
}

export function updateProspectStatus(
  id: number,
  input: ProspectStatusUpdateInput,
): Promise<ProspectResponse | undefined> {
  return apiMutation<ProspectResponse | undefined>(
    `${PROSPECTS_API}/${id}/status`,
    { method: "PATCH", body: JSON.stringify(input) },
  );
}

export function listProspectEvaluations(
  prospectId: number,
  query: ProspectEvaluationQuery,
  signal?: AbortSignal,
): Promise<PageResponse<ProspectEvaluation>> {
  return apiRequest<PageResponse<ProspectEvaluation>>(
    `${PROSPECTS_API}/${prospectId}/evaluations${toQueryString({
      page: query.page,
      size: query.size,
    })}`,
    { method: "GET", signal },
  );
}

export function createProspectEvaluation(
  prospectId: number,
  input: ProspectEvaluationInput,
): Promise<ProspectEvaluation | undefined> {
  return apiMutation<ProspectEvaluation | undefined>(
    `${PROSPECTS_API}/${prospectId}/evaluations`,
    { method: "POST", body: JSON.stringify(input) },
  );
}
