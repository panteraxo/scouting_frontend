import type { UserRole } from "@/types/api";

export function canManageRecommendations(role: UserRole | undefined): boolean {
  return role === "SCOUT";
}

export function canManageClubRecommendations(
  role: UserRole | undefined,
): boolean {
  return role === "CLUB_MANAGER";
}

export function canAuditRecommendations(role: UserRole | undefined): boolean {
  return role === "ADMIN";
}
