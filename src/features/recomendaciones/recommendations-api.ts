import { apiMutation, apiRequest } from "@/lib/api-client";
import type {
  PageQuery,
  PageResponse,
  RecommendationAdminResponse,
  RecommendationClubReplyInput,
  RecommendationCreateInput,
  RecommendationDetail,
  RecommendationSummary,
} from "@/types/api";
import {
  ADMIN_RECOMMENDATIONS_API,
  CLUB_RECOMMENDATIONS_API,
  RECOMMENDATIONS_API,
} from "./routes";

function pageQuery(query: PageQuery): string {
  return `?page=${query.page}&size=${query.size}`;
}

export function listProspectRecommendations(
  prospectId: number,
  query: PageQuery,
  signal?: AbortSignal,
): Promise<PageResponse<RecommendationSummary>> {
  return apiRequest<PageResponse<RecommendationSummary>>(
    `/prospects/${prospectId}/recommendations${pageQuery(query)}`,
    { method: "GET", signal },
  );
}

export function createProspectRecommendation(
  prospectId: number,
  input: RecommendationCreateInput,
): Promise<RecommendationDetail | undefined> {
  return apiMutation<RecommendationDetail | undefined>(
    `/prospects/${prospectId}/recommendations`,
    { method: "POST", body: JSON.stringify(input) },
  );
}

export function getScoutRecommendation(
  id: number,
  signal?: AbortSignal,
): Promise<RecommendationDetail> {
  return apiRequest<RecommendationDetail>(`${RECOMMENDATIONS_API}/${id}`, {
    method: "GET",
    signal,
  });
}

export function listClubRecommendations(
  query: PageQuery,
  signal?: AbortSignal,
): Promise<PageResponse<RecommendationSummary>> {
  return apiRequest<PageResponse<RecommendationSummary>>(
    `${CLUB_RECOMMENDATIONS_API}${pageQuery(query)}`,
    { method: "GET", signal },
  );
}

export function getClubRecommendation(
  id: number,
  signal?: AbortSignal,
): Promise<RecommendationDetail> {
  return apiRequest<RecommendationDetail>(
    `${CLUB_RECOMMENDATIONS_API}/${id}`,
    { method: "GET", signal },
  );
}

export function respondToClubRecommendation(
  id: number,
  input: RecommendationClubReplyInput,
): Promise<RecommendationDetail | undefined> {
  return apiMutation<RecommendationDetail | undefined>(
    `${CLUB_RECOMMENDATIONS_API}/${id}/responses`,
    { method: "POST", body: JSON.stringify(input) },
  );
}

export function listAdminRecommendations(
  query: PageQuery,
  signal?: AbortSignal,
): Promise<PageResponse<RecommendationAdminResponse>> {
  return apiRequest<PageResponse<RecommendationAdminResponse>>(
    `${ADMIN_RECOMMENDATIONS_API}${pageQuery(query)}`,
    { method: "GET", signal },
  );
}

export function getAdminRecommendation(
  id: number,
  signal?: AbortSignal,
): Promise<RecommendationAdminResponse> {
  return apiRequest<RecommendationAdminResponse>(
    `${ADMIN_RECOMMENDATIONS_API}/${id}`,
    { method: "GET", signal },
  );
}
