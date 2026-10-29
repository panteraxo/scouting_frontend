import type {
  OperationalStatus,
  OrganizationKind,
  VerificationStatus,
} from "@/types/api";

const KIND_TITLE: Record<OrganizationKind, string> = {
  academy: "Academia",
  club: "Club",
};

const KIND_NOUN: Record<OrganizationKind, string> = {
  academy: "academia",
  club: "club",
};

const KIND_PLURAL: Record<OrganizationKind, string> = {
  academy: "academias",
  club: "clubes",
};

const VERIFICATION_LABELS: Record<VerificationStatus, string> = {
  PENDING_VERIFICATION: "Pendiente de verificación",
  VERIFIED: "Verificada",
  REJECTED: "Rechazada",
};

const OPERATIONAL_LABELS: Record<OperationalStatus, string> = {
  ACTIVE: "Activa",
  INACTIVE: "Inhabilitada",
};

export function kindTitle(kind: OrganizationKind): string {
  return KIND_TITLE[kind];
}

export function kindNoun(kind: OrganizationKind): string {
  return KIND_NOUN[kind];
}

export function kindPlural(kind: OrganizationKind): string {
  return KIND_PLURAL[kind];
}

/** Artículo definido con mayúscula inicial: "La academia" / "El club". */
export function kindThe(kind: OrganizationKind): string {
  return kind === "academy" ? "La academia" : "El club";
}

export function verificationLabel(status: VerificationStatus): string {
  return VERIFICATION_LABELS[status];
}

export function operationalStatusLabel(status: OperationalStatus): string {
  return OPERATIONAL_LABELS[status];
}

export function verificationBadgeClass(status: VerificationStatus): string {
  if (status === "VERIFIED") {
    return "statusBadge statusVerified";
  }

  if (status === "REJECTED") {
    return "statusBadge statusRejected";
  }

  return "statusBadge statusPending";
}

export function operationalBadgeClass(status: OperationalStatus): string {
  return status === "ACTIVE"
    ? "statusBadge statusActive"
    : "statusBadge statusInactive";
}

const numberFormatter = new Intl.NumberFormat("es-PE");

/**
 * Los conteos desconocidos (`null`/`undefined`) se muestran como "—".
 * Nunca se convierten en cero.
 */
export function formatCount(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "—";
  }

  return numberFormatter.format(value);
}

export function displayText(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "—";
}

interface LocationFields {
  departmentName?: string | null;
  provinceName?: string | null;
  districtName?: string | null;
  ubigeoCode?: string | null;
}

export function formatLocation(organization: LocationFields): string {
  const parts = [
    organization.departmentName,
    organization.provinceName,
    organization.districtName,
  ]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));

  if (parts.length > 0) {
    return parts.join(" · ");
  }

  const ubigeoCode = organization.ubigeoCode?.trim();
  return ubigeoCode ? ubigeoCode : "—";
}

export function formatFoundationYear(
  value: number | null | undefined,
): string {
  return typeof value === "number" && Number.isFinite(value)
    ? String(value)
    : "—";
}

const dateFormatter = new Intl.DateTimeFormat("es-PE", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Lima",
});

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date);
}

/**
 * Solo se enlazan URLs http(s). Cualquier otro valor se muestra como texto
 * para evitar esquemas peligrosos.
 */
export function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}
