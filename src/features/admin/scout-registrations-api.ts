import { apiMutation, apiRequest } from "@/lib/api-client";
import type {
  PageResponse,
  ScoutRegistration,
  ScoutRegistrationQuery,
} from "@/types/api";

export function listScoutRegistrations(
  query: ScoutRegistrationQuery,
  signal?: AbortSignal,
): Promise<PageResponse<ScoutRegistration>> {
  const params = new URLSearchParams({
    status: query.status,
    page: String(query.page),
    size: String(query.size),
  });

  return apiRequest<PageResponse<ScoutRegistration>>(
    `/admin/scout-registrations?${params.toString()}`,
    { method: "GET", signal },
  );
}

export function approveScoutRegistration(
  id: number,
): Promise<ScoutRegistration> {
  return apiMutation<ScoutRegistration>(
    `/admin/scout-registrations/${id}/approve`,
    { method: "POST" },
  );
}

export function rejectScoutRegistration(
  id: number,
): Promise<ScoutRegistration> {
  return apiMutation<ScoutRegistration>(
    `/admin/scout-registrations/${id}/reject`,
    { method: "POST" },
  );
}
