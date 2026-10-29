import type { UserRole } from "@/types/api";

export function canViewPlayers(role: UserRole | undefined): boolean {
  return (
    role === "ADMIN" ||
    role === "ACADEMY_DIRECTOR" ||
    role === "PROFESSOR" ||
    role === "SCOUT"
  );
}

export function canManagePlayers(role: UserRole | undefined): boolean {
  return (
    role === "ADMIN" ||
    role === "ACADEMY_DIRECTOR" ||
    role === "PROFESSOR"
  );
}

export function canCreatePlayers(role: UserRole | undefined): boolean {
  return canManagePlayers(role);
}

export function isPlayer(role: UserRole | undefined): boolean {
  return role === "PLAYER";
}

export function canAccessGuardian(role: UserRole | undefined): boolean {
  return (
    role === "ACADEMY_DIRECTOR" ||
    role === "PROFESSOR" ||
    role === "SCOUT"
  );
}

export function canWriteGuardian(role: UserRole | undefined): boolean {
  return role === "ACADEMY_DIRECTOR" || role === "PROFESSOR";
}

export function canAccessPlayerDirectory(role: UserRole | undefined): boolean {
  return role === "SCOUT" || role === "ADMIN";
}

export function isStaffRole(role: UserRole | undefined): boolean {
  return role === "ACADEMY_DIRECTOR" || role === "PROFESSOR";
}
