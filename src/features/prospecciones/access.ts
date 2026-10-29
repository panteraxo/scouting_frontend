import type { UserRole } from "@/types/api";

export function canUseProspects(role: UserRole | undefined): boolean {
  return role === "SCOUT";
}
