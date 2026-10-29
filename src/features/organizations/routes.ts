import type { OrganizationKind } from "@/types/api";

/** Rutas de la API por tipo de organización. */
export const ADMIN_ORGANIZATION_API: Record<OrganizationKind, string> = {
  academy: "/admin/academies",
  club: "/admin/clubs",
};

export const OWN_ORGANIZATION_API: Record<OrganizationKind, string> = {
  academy: "/academies",
  club: "/clubs",
};

export const DIRECTORY_ORGANIZATION_API: Record<OrganizationKind, string> = {
  academy: "/directory/academies",
  club: "/directory/clubs",
};

/** Rutas de la interfaz por tipo de organización. */
export const ADMIN_ORGANIZATION_PATH: Record<OrganizationKind, string> = {
  academy: "/admin/academias",
  club: "/admin/clubes",
};

export const OWN_ORGANIZATION_PATH: Record<OrganizationKind, string> = {
  academy: "/mi-academia",
  club: "/mi-club",
};

export const READ_ONLY_ORGANIZATION_PATH: Record<OrganizationKind, string> = {
  academy: "/academias",
  club: "/clubes",
};

export function adminCreatePath(kind: OrganizationKind): string {
  return `${ADMIN_ORGANIZATION_PATH[kind]}/${kind === "academy" ? "nueva" : "nuevo"}`;
}

export function adminDetailPath(kind: OrganizationKind, id: number): string {
  return `${ADMIN_ORGANIZATION_PATH[kind]}/${id}`;
}

export function adminEditPath(kind: OrganizationKind, id: number): string {
  return `${ADMIN_ORGANIZATION_PATH[kind]}/${id}/editar`;
}

export function ownEditPath(kind: OrganizationKind): string {
  return `${OWN_ORGANIZATION_PATH[kind]}/editar`;
}

export function readOnlyDetailPath(
  kind: OrganizationKind,
  id: number,
): string {
  return `${READ_ONLY_ORGANIZATION_PATH[kind]}/${id}`;
}
