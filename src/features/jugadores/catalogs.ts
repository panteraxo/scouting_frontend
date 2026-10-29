import type {
  ActivityType,
  AgeCategory,
  CompetitiveLevel,
  DominantFoot,
  GuardianConsentStatus,
  GuardianDataStatus,
  Participation,
  PlayerOperationalStatus,
  PlayerPosition,
  PlayerProfileStatus,
  PlayerResidence,
  PlayerStatAverage,
  PlayerStatCount,
  PositionGroup,
  TeamResult,
} from "@/types/api";

export const POSITION_OPTIONS: Array<{
  value: PlayerPosition;
  label: string;
  group: PositionGroup;
}> = [
  { value: "GOALKEEPER", label: "Arquero", group: "GOALKEEPER" },
  { value: "CENTER_BACK", label: "Defensa central", group: "DEFENDER" },
  { value: "FULL_BACK", label: "Lateral", group: "DEFENDER" },
  { value: "WING_BACK", label: "Carrilero", group: "DEFENDER" },
  {
    value: "DEFENSIVE_MIDFIELDER",
    label: "Mediocampista defensivo",
    group: "MIDFIELDER",
  },
  {
    value: "CENTRAL_MIDFIELDER",
    label: "Mediocampista central",
    group: "MIDFIELDER",
  },
  {
    value: "ATTACKING_MIDFIELDER",
    label: "Mediocampista ofensivo",
    group: "MIDFIELDER",
  },
  {
    value: "LEFT_MIDFIELDER",
    label: "Mediocampista izquierdo",
    group: "MIDFIELDER",
  },
  {
    value: "RIGHT_MIDFIELDER",
    label: "Mediocampista derecho",
    group: "MIDFIELDER",
  },
  { value: "LEFT_WINGER", label: "Extremo izquierdo", group: "FORWARD" },
  { value: "RIGHT_WINGER", label: "Extremo derecho", group: "FORWARD" },
  { value: "SECOND_STRIKER", label: "Segundo delantero", group: "FORWARD" },
  { value: "STRIKER", label: "Delantero centro", group: "FORWARD" },
];

export const POSITION_GROUP_OPTIONS: Array<{
  value: PositionGroup;
  label: string;
}> = [
  { value: "GOALKEEPER", label: "Arquero" },
  { value: "DEFENDER", label: "Defensa" },
  { value: "MIDFIELDER", label: "Mediocampo" },
  { value: "FORWARD", label: "Delantero" },
];

export const DOMINANT_FOOT_OPTIONS: Array<{
  value: DominantFoot;
  label: string;
}> = [
  { value: "LEFT", label: "Izquierdo" },
  { value: "RIGHT", label: "Derecho" },
  { value: "BOTH", label: "Ambidiestro" },
];

export const AGE_CATEGORY_OPTIONS: Array<{
  value: AgeCategory;
  label: string;
}> = [
  { value: "SUB_8", label: "Sub-8" },
  { value: "SUB_10", label: "Sub-10" },
  { value: "SUB_12", label: "Sub-12" },
  { value: "SUB_13", label: "Sub-13" },
  { value: "SUB_14", label: "Sub-14" },
  { value: "SUB_15", label: "Sub-15" },
  { value: "SUB_16", label: "Sub-16" },
  { value: "SUB_17", label: "Sub-17" },
  { value: "SUB_18", label: "Sub-18" },
  { value: "SUB_20", label: "Sub-20" },
  { value: "SUB_23", label: "Sub-23" },
  { value: "SENIOR", label: "Senior" },
];

export const ACTIVITY_TYPE_OPTIONS: Array<{
  value: ActivityType;
  label: string;
  matchLike: boolean;
}> = [
  { value: "OFFICIAL_MATCH", label: "Partido oficial", matchLike: true },
  { value: "FRIENDLY_MATCH", label: "Amistoso", matchLike: true },
  { value: "TOURNAMENT", label: "Torneo", matchLike: true },
  { value: "TRAINING", label: "Entrenamiento", matchLike: false },
  { value: "SPORTS_TRIAL", label: "Prueba deportiva", matchLike: false },
];

export const COMPETITIVE_LEVEL_OPTIONS: Array<{
  value: CompetitiveLevel;
  label: string;
}> = [
  { value: "ACADEMY", label: "Academia" },
  { value: "LOCAL", label: "Local" },
  { value: "REGIONAL", label: "Regional" },
  { value: "NATIONAL", label: "Nacional" },
  { value: "INTERNATIONAL", label: "Internacional" },
];

export const PARTICIPATION_OPTIONS: Array<{
  value: Participation;
  label: string;
}> = [
  { value: "STARTER", label: "Titular" },
  { value: "SUBSTITUTE", label: "Suplente" },
  { value: "DID_NOT_PLAY", label: "No jugó" },
];

export const TEAM_RESULT_OPTIONS: Array<{
  value: TeamResult;
  label: string;
}> = [
  { value: "WIN", label: "Ganó" },
  { value: "DRAW", label: "Empató" },
  { value: "LOSS", label: "Perdió" },
];

export const CONSENT_STATUS_LABELS: Record<GuardianConsentStatus, string> = {
  NOT_RECORDED: "No registrado",
  GRANTED: "Autorizado",
  DENIED: "Denegado",
  REVOKED: "Revocado",
};

export const GUARDIAN_DATA_STATUS_LABELS: Record<GuardianDataStatus, string> =
  {
    NOT_APPLICABLE: "No aplica",
    MISSING: "Sin tutor registrado",
    RECORDED: "Tutor registrado",
  };

export const OPERATIONAL_STATUS_LABELS: Record<
  PlayerOperationalStatus,
  string
> = {
  ACTIVE: "Activo",
  INACTIVE: "Inhabilitado",
};

export const PROFILE_STATUS_LABELS: Record<PlayerProfileStatus, string> = {
  INCOMPLETE: "Incompleto",
  COMPLETE: "Completo",
};

export function positionLabel(position: PlayerPosition | null | undefined): string {
  return (
    POSITION_OPTIONS.find((option) => option.value === position)?.label ?? "—"
  );
}

export function positionGroupLabel(
  group: PositionGroup | null | undefined,
): string {
  return (
    POSITION_GROUP_OPTIONS.find((option) => option.value === group)?.label ?? "—"
  );
}

export function positionGroupOf(
  position: PlayerPosition | null | undefined,
): PositionGroup | null {
  return (
    POSITION_OPTIONS.find((option) => option.value === position)?.group ?? null
  );
}

export function activityTypeLabel(
  type: ActivityType | null | undefined,
): string {
  return (
    ACTIVITY_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? "—"
  );
}

export function isMatchActivity(type: ActivityType | null | undefined): boolean {
  return (
    ACTIVITY_TYPE_OPTIONS.find((option) => option.value === type)?.matchLike ??
    false
  );
}

export function ageCategoryLabel(
  category: AgeCategory | null | undefined,
): string {
  return (
    AGE_CATEGORY_OPTIONS.find((option) => option.value === category)?.label ??
    "—"
  );
}

export function competitiveLevelLabel(
  level: CompetitiveLevel | null | undefined,
): string {
  return (
    COMPETITIVE_LEVEL_OPTIONS.find((option) => option.value === level)?.label ??
    "—"
  );
}

export function participationLabel(
  participation: Participation | null | undefined,
): string {
  return (
    PARTICIPATION_OPTIONS.find((option) => option.value === participation)
      ?.label ?? "—"
  );
}

export function teamResultLabel(result: TeamResult | null | undefined): string {
  return (
    TEAM_RESULT_OPTIONS.find((option) => option.value === result)?.label ?? "—"
  );
}

export function dominantFootLabel(foot: DominantFoot | null | undefined): string {
  return (
    DOMINANT_FOOT_OPTIONS.find((option) => option.value === foot)?.label ?? "—"
  );
}

export function consentStatusLabel(
  status: GuardianConsentStatus | null | undefined,
): string {
  return status ? CONSENT_STATUS_LABELS[status] : "—";
}

export function playerFullName(player: {
  firstName: string;
  lastName: string;
}): string {
  return `${player.firstName} ${player.lastName}`.trim();
}

const numberFormatter = new Intl.NumberFormat("es-PE");

export function displayText(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "—";
}

export function formatAge(value: number | null | undefined): string {
  return typeof value === "number" ? `${value} años` : "—";
}

export function formatExperience(value: number | null | undefined): string {
  if (typeof value !== "number") {
    return "—";
  }
  return value === 1 ? "1 año" : `${value} años`;
}

export function formatHeight(value: number | null | undefined): string {
  return typeof value === "number" ? `${value} cm` : "—";
}

export function formatWeight(value: number | null | undefined): string {
  return typeof value === "number"
    ? `${numberFormatter.format(value)} kg`
    : "—";
}

export function formatResidence(
  residence: PlayerResidence | null | undefined,
  includeDistrict = true,
): string {
  if (!residence) {
    return "—";
  }

  const parts = [
    residence.departmentName,
    residence.provinceName,
    includeDistrict ? residence.districtName : null,
  ]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));

  return parts.length > 0 ? parts.join(" · ") : "—";
}

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeZone: "America/Lima",
  }).format(date);
}

const dateTimeFormatter = new Intl.DateTimeFormat("es-PE", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Lima",
});

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateTimeFormatter.format(date);
}

/** `value` nulo se muestra como —; cero se muestra como 0. */
export function formatStatCount(
  stat: PlayerStatCount | null | undefined,
): string {
  if (!stat || stat.value === null) {
    return "—";
  }

  return numberFormatter.format(stat.value);
}

export function formatStatAverage(
  stat: PlayerStatAverage | null | undefined,
): string {
  if (!stat || stat.value === null) {
    return "—";
  }

  return numberFormatter.format(stat.value);
}

export function formatCoverage(
  stat: PlayerStatCount | PlayerStatAverage | null | undefined,
): string {
  if (!stat || stat.coverage === null) {
    return "Sin datos";
  }

  return `${Math.round(stat.coverage * 100)}% cobertura`;
}

export function metricDefinitionsForGroup(
  group: PositionGroup | null | undefined,
): Array<{
  key: string;
  label: string;
  kind: "number" | "boolean";
}> {
  switch (group) {
    case "GOALKEEPER":
      return [
        { key: "saves", label: "Atajadas", kind: "number" },
        { key: "goalsConceded", label: "Goles recibidos", kind: "number" },
        { key: "cleanSheet", label: "Valla invicta", kind: "boolean" },
        { key: "crossInterventions", label: "Intervenciones", kind: "number" },
        { key: "passesAttempted", label: "Pases intentados", kind: "number" },
        { key: "passesCompleted", label: "Pases completados", kind: "number" },
      ];
    case "DEFENDER":
      return [
        { key: "successfulTackles", label: "Entradas exitosas", kind: "number" },
        { key: "interceptions", label: "Intercepciones", kind: "number" },
        { key: "clearances", label: "Despejes", kind: "number" },
        { key: "duelsWon", label: "Duelos ganados", kind: "number" },
        { key: "blocks", label: "Bloqueos", kind: "number" },
        {
          key: "errorsLeadingToChance",
          label: "Errores que generan ocasión",
          kind: "number",
        },
      ];
    case "MIDFIELDER":
      return [
        { key: "passesAttempted", label: "Pases intentados", kind: "number" },
        { key: "passesCompleted", label: "Pases completados", kind: "number" },
        { key: "interceptions", label: "Intercepciones", kind: "number" },
        { key: "keyPasses", label: "Pases clave", kind: "number" },
        { key: "assists", label: "Asistencias", kind: "number" },
        { key: "recoveries", label: "Recuperaciones", kind: "number" },
        { key: "duelsWon", label: "Duelos ganados", kind: "number" },
        { key: "successfulDribbles", label: "Regates exitosos", kind: "number" },
        { key: "shots", label: "Tiros", kind: "number" },
      ];
    case "FORWARD":
      return [
        { key: "goals", label: "Goles", kind: "number" },
        { key: "assists", label: "Asistencias", kind: "number" },
        { key: "shots", label: "Tiros", kind: "number" },
        { key: "successfulDribbles", label: "Regates exitosos", kind: "number" },
        { key: "chancesCreated", label: "Ocasiones creadas", kind: "number" },
        { key: "crossesAttempted", label: "Centros intentados", kind: "number" },
        { key: "crossesCompleted", label: "Centros completados", kind: "number" },
      ];
    default:
      return [];
  }
}
