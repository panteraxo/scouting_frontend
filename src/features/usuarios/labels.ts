import { roleLabel, statusLabel } from "@/features/auth/user-labels";
import type {
  ManagedUserSummary,
  ManagedUserStatus,
  UserRole,
  UserStatus,
} from "@/types/api";

/** Orden estable de roles para filtros y formularios. */
export const USER_ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = [
  { value: "ADMIN", label: roleLabel("ADMIN") },
  { value: "ACADEMY_DIRECTOR", label: roleLabel("ACADEMY_DIRECTOR") },
  { value: "PROFESSOR", label: roleLabel("PROFESSOR") },
  { value: "CLUB_MANAGER", label: roleLabel("CLUB_MANAGER") },
  { value: "SCOUT", label: roleLabel("SCOUT") },
  { value: "PLAYER", label: roleLabel("PLAYER") },
];

/**
 * Roles que se pueden crear desde el módulo Usuarios. Jugador se excluye: su
 * cuenta se crea junto con el perfil deportivo desde Jugadores → Nuevo jugador.
 */
export const CREATABLE_USER_ROLE_OPTIONS: Array<{
  value: UserRole;
  label: string;
}> = USER_ROLE_OPTIONS.filter((option) => option.value !== "PLAYER");

export const CREATABLE_USER_ROLES: UserRole[] =
  CREATABLE_USER_ROLE_OPTIONS.map((option) => option.value);

/** Rol inicial del formulario administrativo de alta de usuarios. */
export const DEFAULT_CREATABLE_USER_ROLE: UserRole = "ACADEMY_DIRECTOR";

export const MANAGED_STATUS_OPTIONS: Array<{
  value: ManagedUserStatus;
  label: string;
}> = [
  { value: "ACTIVE", label: "Activas" },
  { value: "INACTIVE", label: "Inhabilitadas" },
];

export function roleRequiresAcademy(role: UserRole): boolean {
  return (
    role === "ACADEMY_DIRECTOR" || role === "PROFESSOR" || role === "PLAYER"
  );
}

export function roleRequiresClub(role: UserRole): boolean {
  return role === "CLUB_MANAGER";
}

export function roleRequiresOrganization(role: UserRole): boolean {
  return roleRequiresAcademy(role) || roleRequiresClub(role);
}

export function canAccessAdminUsers(role: UserRole | undefined): boolean {
  return role === "ADMIN";
}

export function canCreateUsers(role: UserRole | undefined): boolean {
  return role === "ADMIN" || role === "ACADEMY_DIRECTOR";
}

/**
 * Roles que un Director de academia puede crear dentro de su propia academia.
 * El Profesor ya no crea cuentas: los jugadores se registran desde
 * Jugadores → Nuevo jugador.
 */
export function scopedCreatableRoles(role: UserRole | undefined): UserRole[] {
  if (role === "PROFESSOR") {
    return [];
  }

  if (role === "ACADEMY_DIRECTOR") {
    return ["PROFESSOR"];
  }

  return [];
}

/** Etiqueta de estado. `PENDING_APPROVAL` solo puede aparecer en ojeadores. */
export function managedStatusLabel(status: UserStatus): string {
  return statusLabel(status);
}

export function manageBadgeClass(status: UserStatus): string {
  if (status === "ACTIVE") {
    return "statusBadge statusActive";
  }

  if (status === "INACTIVE") {
    return "statusBadge statusInactive";
  }

  return "statusBadge statusPending";
}

export function userOrganizationType(
  user: ManagedUserSummary,
): "ACADEMY" | "CLUB" | null {
  if (user.academyId) {
    return "ACADEMY";
  }

  if (user.clubId) {
    return "CLUB";
  }

  if (roleRequiresAcademy(user.role)) {
    return "ACADEMY";
  }

  if (roleRequiresClub(user.role)) {
    return "CLUB";
  }

  return null;
}

export function userAcademyId(user: ManagedUserSummary): number | null {
  return user.academyId ?? null;
}

export function userClubId(user: ManagedUserSummary): number | null {
  return user.clubId ?? null;
}

export function userPosition(user: {
  position?: string | null;
}): string | null {
  const value = user.position ?? null;

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/**
 * Nombre de la organización asignada, sin inferirla cuando la API no la envía.
 */
export function userOrganizationName(user: ManagedUserSummary): string | null {
  const type = userOrganizationType(user);

  if (type === "ACADEMY") {
    return (
      user.academyName ??
      (userAcademyId(user) ? `Academia #${userAcademyId(user)}` : null)
    );
  }

  if (type === "CLUB") {
    return (
      user.clubName ??
      (userClubId(user) ? `Club #${userClubId(user)}` : null)
    );
  }

  return null;
}

export function userOrganizationLabel(user: ManagedUserSummary): string {
  const name = userOrganizationName(user);

  if (name) {
    return name;
  }

  if (roleRequiresOrganization(user.role)) {
    return "Sin organización asignada";
  }

  return "—";
}

export function userOrganizationCode(user: ManagedUserSummary): string | null {
  return user.academyCode ?? user.clubCode ?? null;
}

export function isPendingScout(user: ManagedUserSummary): boolean {
  return user.status === "PENDING_APPROVAL";
}
