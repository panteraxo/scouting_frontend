import type { ProspectStatus } from "@/types/api";

export const PROSPECT_STATUS_OPTIONS: Array<{
  value: ProspectStatus;
  label: string;
}> = [
  { value: "FOLLOWING", label: "En seguimiento" },
  { value: "PAUSED", label: "Pausada" },
  { value: "CLOSED", label: "Cerrada" },
];

const STATUS_LABELS: Record<ProspectStatus, string> = {
  FOLLOWING: "En seguimiento",
  PAUSED: "Pausada",
  CLOSED: "Cerrada",
};

export function prospectStatusLabel(status: ProspectStatus): string {
  return STATUS_LABELS[status];
}

export function prospectStatusBadgeClass(status: ProspectStatus): string {
  if (status === "FOLLOWING") {
    return "statusBadge statusActive";
  }

  if (status === "PAUSED") {
    return "statusBadge statusPending";
  }

  return "statusBadge statusInactive";
}

export function allowedStatusTransitions(
  status: ProspectStatus,
): ProspectStatus[] {
  if (status === "FOLLOWING") {
    return ["PAUSED", "CLOSED"];
  }

  if (status === "PAUSED") {
    return ["FOLLOWING", "CLOSED"];
  }

  return ["FOLLOWING"];
}

export function statusActionLabel(
  current: ProspectStatus,
  target: ProspectStatus,
): string {
  if (target === "PAUSED") {
    return "Pausar";
  }

  if (target === "CLOSED") {
    return "Cerrar";
  }

  return current === "CLOSED" ? "Reabrir" : "Reanudar";
}

export function statusConfirmDescription(
  current: ProspectStatus,
  target: ProspectStatus,
): string {
  if (target === "PAUSED") {
    return "La prospección quedará pausada. Puedes reanudarla después; el historial de evaluaciones se conserva.";
  }

  if (target === "CLOSED") {
    return "La prospección quedará cerrada y no admitirá nuevas evaluaciones hasta reabrirla. Las evaluaciones existentes se conservan.";
  }

  return current === "CLOSED"
    ? "La prospección volverá a estar en seguimiento y podrás agregar nuevas evaluaciones."
    : "La prospección volverá a estar en seguimiento.";
}

export function prospectPlayerName(player: {
  firstName: string;
  lastName: string;
}): string {
  return `${player.firstName} ${player.lastName}`.trim();
}

const dateFormatter = new Intl.DateTimeFormat("es-PE", {
  dateStyle: "medium",
  timeZone: "UTC",
});

const dateTimeFormatter = new Intl.DateTimeFormat("es-PE", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Lima",
});

export function todayInLima(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Formatea una fecha date-only (YYYY-MM-DD) sin conversión a zona local.
 * Se construye en UTC y se presenta en UTC para no desplazar el día.
 */
export function formatProspectDate(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return "—";
  }

  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );
  return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date);
}

export function formatProspectDateTime(
  value: string | null | undefined,
): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateTimeFormatter.format(date);
}

export function formatProspectAge(value: number | null | undefined): string {
  return typeof value === "number" ? `${value} años` : "—";
}

export function displayProspectText(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "—";
}
