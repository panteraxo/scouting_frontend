import type { DocumentType, UserRole, UserStatus } from "@/types/api";

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Administrador",
  PROFESSOR: "Profesor",
  ACADEMY_DIRECTOR: "Director de academia",
  SCOUT: "Ojeador",
  CLUB_MANAGER: "Responsable de club",
  PLAYER: "Jugador",
};

const STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: "Activa",
  PENDING_APPROVAL: "Pendiente",
  INACTIVE: "Inactiva",
};

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  DNI: "DNI",
  CE: "Carné de extranjería",
  PASSPORT: "Pasaporte",
};

export function roleLabel(role: UserRole): string {
  return ROLE_LABELS[role];
}

export function statusLabel(status: UserStatus): string {
  return STATUS_LABELS[status];
}

export function documentTypeLabel(documentType: DocumentType): string {
  return DOCUMENT_TYPE_LABELS[documentType];
}

export function fullName(user: { firstName: string; lastName: string }): string {
  return `${user.firstName} ${user.lastName}`.trim();
}

export function initials(user: { firstName: string; lastName: string }): string {
  const first = user.firstName.trim().charAt(0);
  const last = user.lastName.trim().charAt(0);
  return `${first}${last}`.toUpperCase() || "SP";
}
