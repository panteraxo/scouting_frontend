import type {
  RecommendationResponseStatus,
  RecommendationStatus,
} from "@/types/api";

export const RECOMMENDATION_STATUS_LABELS: Record<
  RecommendationStatus,
  string
> = {
  SENT: "Enviada",
  RESPONDED: "Respondida",
};

export const RESPONSE_STATUS_LABELS: Record<
  RecommendationResponseStatus,
  string
> = {
  INTERESTED: "Interesado",
  INFO_REQUESTED: "Solicita más información",
  NOT_INTERESTED: "No interesado",
};

export const RESPONSE_STATUS_OPTIONS: Array<{
  value: RecommendationResponseStatus;
  label: string;
}> = [
  { value: "INTERESTED", label: "Interesado" },
  { value: "INFO_REQUESTED", label: "Solicita más información" },
  { value: "NOT_INTERESTED", label: "No interesado" },
];

export function recommendationStatusLabel(status: RecommendationStatus): string {
  return RECOMMENDATION_STATUS_LABELS[status];
}

export function recommendationStatusBadgeClass(
  status: RecommendationStatus,
): string {
  return status === "RESPONDED"
    ? "statusBadge statusVerified"
    : "statusBadge statusPending";
}

export function responseStatusLabel(
  status: RecommendationResponseStatus | null | undefined,
): string {
  return status ? RESPONSE_STATUS_LABELS[status] : "—";
}

export function responseStatusBadgeClass(
  status: RecommendationResponseStatus | null | undefined,
): string {
  if (status === "INTERESTED") {
    return "statusBadge statusVerified";
  }
  if (status === "NOT_INTERESTED") {
    return "statusBadge statusInactive";
  }
  if (status === "INFO_REQUESTED") {
    return "statusBadge statusPending";
  }
  return "statusBadge statusNeutral";
}

export function recommendationPlayerName(player: {
  firstName: string;
  lastName: string;
}): string {
  return `${player.firstName} ${player.lastName}`.trim();
}

export function recommendationScoutName(scout: {
  firstName: string;
  lastName: string;
}): string {
  return `${scout.firstName} ${scout.lastName}`.trim();
}
