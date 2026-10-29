"use client";

import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";
import { Alert } from "@/components/ui/alert";
import {
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/ui/form-field";
import { Spinner } from "@/components/ui/loading";
import { useAuth } from "@/features/auth/auth-provider";
import { ApiError } from "@/lib/api-client";
import type {
  ActivityType,
  AgeCategory,
  CompetitiveLevel,
  Participation,
  PlayerHistoryCorrectionInput,
  PlayerHistoryEntryResponse,
  PlayerHistoryInput,
  PlayerHistoryMetrics,
  PlayerHistoryRatings,
  PlayerPosition,
  TeamResult,
} from "@/types/api";
import {
  ACTIVITY_TYPE_OPTIONS,
  AGE_CATEGORY_OPTIONS,
  COMPETITIVE_LEVEL_OPTIONS,
  isMatchActivity,
  metricDefinitionsForGroup,
  PARTICIPATION_OPTIONS,
  POSITION_OPTIONS,
  positionGroupLabel,
  positionGroupOf,
  TEAM_RESULT_OPTIONS,
} from "../catalogs";

type FieldErrors = Record<string, string>;

interface HistoryFormState {
  activityType: string;
  activityDate: string;
  competition: string;
  opponent: string;
  ageCategory: string;
  competitiveLevel: string;
  positionPlayed: string;
  participation: string;
  minutesPlayed: string;
  teamResult: string;
  teamGoals: string;
  opponentGoals: string;
  playerGoals: string;
  assists: string;
  yellowCards: string;
  redCards: string;
  observations: string;
  videoUrl: string;
  videoTimestampSeconds: string;
  videoDescription: string;
  strengths: string;
  improvements: string;
  recommendations: string;
  correctionReason: string;
}

interface RatingsState {
  technical: string;
  tactical: string;
  physical: string;
  mental: string;
  overall: string;
}

const EMPTY_FORM: HistoryFormState = {
  activityType: "",
  activityDate: "",
  competition: "",
  opponent: "",
  ageCategory: "",
  competitiveLevel: "",
  positionPlayed: "",
  participation: "",
  minutesPlayed: "",
  teamResult: "",
  teamGoals: "",
  opponentGoals: "",
  playerGoals: "",
  assists: "",
  yellowCards: "",
  redCards: "",
  observations: "",
  videoUrl: "",
  videoTimestampSeconds: "",
  videoDescription: "",
  strengths: "",
  improvements: "",
  recommendations: "",
  correctionReason: "",
};

const EMPTY_RATINGS: RatingsState = {
  technical: "",
  tactical: "",
  physical: "",
  mental: "",
  overall: "",
};

function toNullableNumber(value: string): number | null {
  return value.trim() ? Number(value) : null;
}

function toNullableString(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function initialForm(
  entry: PlayerHistoryEntryResponse | undefined,
): HistoryFormState {
  if (!entry) {
    return EMPTY_FORM;
  }

  return {
    activityType: entry.activityType,
    activityDate: entry.activityDate,
    competition: entry.competition ?? "",
    opponent: entry.opponent ?? "",
    ageCategory: entry.ageCategory ?? "",
    competitiveLevel: entry.competitiveLevel ?? "",
    positionPlayed: entry.positionPlayed ?? "",
    participation: entry.participation ?? "",
    minutesPlayed:
      entry.minutesPlayed === null ? "" : String(entry.minutesPlayed),
    teamResult: entry.teamResult ?? "",
    teamGoals: entry.teamGoals === null ? "" : String(entry.teamGoals),
    opponentGoals:
      entry.opponentGoals === null ? "" : String(entry.opponentGoals),
    playerGoals:
      entry.playerGoals === null ? "" : String(entry.playerGoals),
    assists: entry.assists === null ? "" : String(entry.assists),
    yellowCards:
      entry.yellowCards === null ? "" : String(entry.yellowCards),
    redCards: entry.redCards === null ? "" : String(entry.redCards),
    observations: entry.observations ?? "",
    videoUrl: entry.videoUrl ?? "",
    videoTimestampSeconds:
      entry.videoTimestampSeconds === null
        ? ""
        : String(entry.videoTimestampSeconds),
    videoDescription: entry.videoDescription ?? "",
    strengths: entry.strengths ?? "",
    improvements: entry.improvements ?? "",
    recommendations: entry.recommendations ?? "",
    correctionReason: "",
  };
}

function initialRatings(
  entry: PlayerHistoryEntryResponse | undefined,
): RatingsState {
  if (!entry?.ratings) {
    return EMPTY_RATINGS;
  }

  const value = (rating: number | null) =>
    rating === null ? "" : String(rating);

  return {
    technical: value(entry.ratings.technical),
    tactical: value(entry.ratings.tactical),
    physical: value(entry.ratings.physical),
    mental: value(entry.ratings.mental),
    overall: value(entry.ratings.overall),
  };
}

function initialMetrics(
  entry: PlayerHistoryEntryResponse | undefined,
): Record<string, string> {
  if (entry?.participation === "DID_NOT_PLAY") {
    return {};
  }

  const group = entry?.positionGroup;
  if (!entry?.metrics || !group) {
    return {};
  }

  const data =
    group === "GOALKEEPER"
      ? entry.metrics.goalkeeper
      : group === "DEFENDER"
        ? entry.metrics.defender
        : group === "MIDFIELDER"
          ? entry.metrics.midfielder
          : entry.metrics.forward;

  if (!data) {
    return {};
  }

  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) {
      continue;
    }
    result[key] = typeof value === "boolean" ? String(value) : String(value);
  }
  return result;
}

export function PlayerHistoryForm({
  mode,
  initial,
  playerName,
  birthDate,
  submitLabel,
  cancelHref,
  onSubmit,
  warning,
}: {
  mode: "create" | "edit";
  initial?: PlayerHistoryEntryResponse;
  playerName: string;
  birthDate: string | null;
  submitLabel: string;
  cancelHref: string;
  onSubmit: (
    input: PlayerHistoryInput | PlayerHistoryCorrectionInput,
  ) => Promise<PlayerHistoryEntryResponse | undefined>;
  warning?: ReactNode;
}) {
  const { markSessionExpired } = useAuth();
  const [state, setState] = useState<HistoryFormState>(() =>
    initialForm(initial),
  );
  const [ratings, setRatings] = useState<RatingsState>(() =>
    initialRatings(initial),
  );
  const [metrics, setMetrics] = useState<Record<string, string>>(() =>
    initialMetrics(initial),
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const matchLike = isMatchActivity(
    state.activityType ? (state.activityType as ActivityType) : null,
  );
  const positionGroup = positionGroupOf(
    state.positionPlayed ? (state.positionPlayed as PlayerPosition) : null,
  );
  const metricDefinitions = metricDefinitionsForGroup(positionGroup);
  const didNotPlay = state.participation === "DID_NOT_PLAY";

  function update<K extends keyof HistoryFormState>(
    key: K,
    value: HistoryFormState[K],
  ) {
    setState((current) => ({ ...current, [key]: value }));
  }

  function changeActivityType(value: string) {
    setState((current) => {
      const nextMatch = isMatchActivity(value as ActivityType);
      return {
        ...current,
        activityType: value,
        teamResult: nextMatch ? current.teamResult : "",
        teamGoals: nextMatch ? current.teamGoals : "",
        opponentGoals: nextMatch ? current.opponentGoals : "",
      };
    });
  }

  function changePosition(value: string) {
    const nextGroup = positionGroupOf(value as PlayerPosition);
    if (nextGroup !== positionGroup) {
      setMetrics({});
    }
    update("positionPlayed", value);
  }

  function changeGeneralStat(
    key: "playerGoals" | "assists",
    value: string,
  ) {
    update(key, value);

    if (!value.trim() || !positionGroup) {
      return;
    }

    if (positionGroup === "FORWARD" && key === "playerGoals" && metrics.goals) {
      setMetrics((current) => ({ ...current, goals: value }));
    }

    if (
      (positionGroup === "FORWARD" || positionGroup === "MIDFIELDER") &&
      key === "assists" &&
      metrics.assists
    ) {
      setMetrics((current) => ({ ...current, assists: value }));
    }
  }

  function changeMetric(key: string, value: string) {
    setMetrics((current) => ({ ...current, [key]: value }));

    if (!value.trim()) {
      return;
    }

    if (positionGroup === "FORWARD" && key === "goals") {
      setState((current) => ({ ...current, playerGoals: value }));
    }

    if (
      (positionGroup === "FORWARD" || positionGroup === "MIDFIELDER") &&
      key === "assists"
    ) {
      setState((current) => ({ ...current, assists: value }));
    }
  }

  function changeParticipation(value: string) {
    if (value === "DID_NOT_PLAY") {
      setMetrics({});
      setState((current) => ({
        ...current,
        participation: value,
        minutesPlayed: "0",
        playerGoals: "0",
        assists: "0",
        yellowCards: "0",
        redCards: "0",
      }));
      return;
    }
    update("participation", value);
  }

  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    const activityDate = state.activityDate;

    if (!state.activityType) {
      errors.activityType = "Selecciona el tipo de actividad.";
    }

    if (!activityDate) {
      errors.activityDate = "Ingresa la fecha de la actividad.";
    } else {
      const today = new Date().toISOString().slice(0, 10);
      if (activityDate > today) {
        errors.activityDate = "La fecha no puede ser futura.";
      }
      if (birthDate && activityDate < birthDate) {
        errors.activityDate =
          "La fecha no puede ser anterior al nacimiento.";
      }
    }

    if (state.competition.trim().length > 150) {
      errors.competition = "La competición no debe superar 150 caracteres.";
    }
    if (state.opponent.trim().length > 150) {
      errors.opponent = "El rival no debe superar 150 caracteres.";
    }

    if (matchLike) {
      if (!state.opponent.trim()) {
        errors.opponent = "Ingresa el rival.";
      }
      if (!state.ageCategory) {
        errors.ageCategory = "Selecciona la categoría de edad.";
      }
      if (!state.competitiveLevel) {
        errors.competitiveLevel = "Selecciona el nivel competitivo.";
      }
      if (!state.positionPlayed) {
        errors.positionPlayed = "Selecciona la posición jugada.";
      }
      if (!state.teamResult) {
        errors.teamResult = "Selecciona el resultado del equipo.";
      }

      const teamGoals = toNullableNumber(state.teamGoals);
      const opponentGoals = toNullableNumber(state.opponentGoals);
      if ((teamGoals === null) !== (opponentGoals === null)) {
        errors.teamGoals =
          "Registra ambos marcadores o deja ambos vacíos.";
        errors.opponentGoals =
          "Registra ambos marcadores o deja ambos vacíos.";
      } else if (teamGoals !== null && opponentGoals !== null) {
        const expected =
          teamGoals > opponentGoals
            ? "WIN"
            : teamGoals < opponentGoals
              ? "LOSS"
              : "DRAW";
        if (state.teamResult && state.teamResult !== expected) {
          errors.teamResult =
            "El resultado no coincide con el marcador registrado.";
        }
        const playerGoals = toNullableNumber(state.playerGoals);
        const assists = toNullableNumber(state.assists);
        if (playerGoals !== null && playerGoals > teamGoals) {
          errors.playerGoals =
            "Los goles del jugador no pueden superar los del equipo.";
        }
        if (assists !== null && assists > teamGoals) {
          errors.assists =
            "Las asistencias no pueden superar los goles del equipo.";
        }
      }
    } else {
      if (state.teamResult || state.teamGoals || state.opponentGoals) {
        errors.teamResult =
          "Entrenamiento y prueba deportiva no admiten resultado ni marcador.";
      }
    }

    const minutes = toNullableNumber(state.minutesPlayed);
    if (minutes !== null && !Number.isInteger(minutes)) {
      errors.minutesPlayed = "Los minutos deben ser un número entero.";
    } else if (minutes !== null && (minutes < 0 || minutes > 150)) {
      errors.minutesPlayed = "Los minutos deben estar entre 0 y 150.";
    }
    if (
      minutes !== null &&
      minutes > 0 &&
      state.participation !== "STARTER" &&
      state.participation !== "SUBSTITUTE"
    ) {
      errors.minutesPlayed =
        "Los minutos requieren participación como titular o suplente.";
    }

    const statFields: Array<[keyof HistoryFormState, string]> = [
      ["teamGoals", "Los goles del equipo"],
      ["opponentGoals", "Los goles del rival"],
      ["playerGoals", "Los goles del jugador"],
      ["assists", "Las asistencias"],
    ];
    for (const [key, label] of statFields) {
      const raw = String(state[key] ?? "").trim();
      if (!raw) {
        continue;
      }
      const value = Number(raw);
      if (!Number.isInteger(value) || value < 0 || value > 99) {
        errors[key] = `${label} deben ser un entero entre 0 y 99.`;
      }
    }

    if (didNotPlay) {
      const invalid =
        (minutes !== null && minutes !== 0) ||
        (toNullableNumber(state.playerGoals) ?? 0) !== 0 ||
        (toNullableNumber(state.assists) ?? 0) !== 0 ||
        (toNullableNumber(state.yellowCards) ?? 0) !== 0 ||
        (toNullableNumber(state.redCards) ?? 0) !== 0;
      if (invalid) {
        errors.participation =
          "No jugó no admite minutos, goles, asistencias ni tarjetas.";
      }
    }

    if (state.yellowCards.trim()) {
      const value = Number(state.yellowCards);
      if (!Number.isInteger(value) || value < 0 || value > 2) {
        errors.yellowCards = "Las amarillas deben ser 0, 1 o 2.";
      }
    }
    if (state.redCards.trim()) {
      const value = Number(state.redCards);
      if (!Number.isInteger(value) || value < 0 || value > 1) {
        errors.redCards = "Las rojas deben ser 0 o 1.";
      }
    }

    if (state.observations.trim().length > 2000) {
      errors.observations = "Las observaciones no deben superar 2000 caracteres.";
    }
    if (state.strengths.trim().length > 2000) {
      errors.strengths = "Las fortalezas no deben superar 2000 caracteres.";
    }
    if (state.improvements.trim().length > 2000) {
      errors.improvements = "Las mejoras no deben superar 2000 caracteres.";
    }
    if (state.recommendations.trim().length > 2000) {
      errors.recommendations =
        "Las recomendaciones no deben superar 2000 caracteres.";
    }

    if (state.videoUrl.trim() && !isHttpUrl(state.videoUrl.trim())) {
      errors.videoUrl = "Ingresa un enlace web válido para el video.";
    } else if (state.videoUrl.trim().length > 500) {
      errors.videoUrl = "El enlace del video no debe superar 500 caracteres.";
    }
    if (state.videoTimestampSeconds.trim()) {
      const value = Number(state.videoTimestampSeconds);
      if (!Number.isInteger(value) || value < 0 || value > 86400) {
        errors.videoTimestampSeconds =
          "El segundo del video debe estar entre 0 y 86400.";
      }
      if (!state.videoUrl.trim()) {
        errors.videoTimestampSeconds =
          "El segundo del video requiere un enlace de video.";
      }
    }
    if (state.videoDescription.trim() && !state.videoUrl.trim()) {
      errors.videoDescription =
        "La descripción requiere un enlace de video.";
    }
    if (state.videoDescription.trim().length > 500) {
      errors.videoDescription =
        "La descripción del video no debe superar 500 caracteres.";
    }

    for (const [key, value] of Object.entries(ratings)) {
      if (!value.trim()) {
        continue;
      }
      const rating = Number(value);
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        errors[`ratings.${key}`] = "El rating debe estar entre 1 y 5.";
      }
    }

    for (const definition of metricDefinitions) {
      const value = metrics[definition.key];
      if (value === undefined || value === "") {
        continue;
      }
      if (definition.kind === "boolean") {
        continue;
      }
      const numeric = Number(value);
      if (!Number.isInteger(numeric) || numeric < 0) {
        errors[`metrics.${definition.key}`] =
          "La métrica debe ser un entero no negativo.";
      }
    }

    if (positionGroup === "GOALKEEPER" || positionGroup === "MIDFIELDER") {
      const attempted = Number(metrics.passesAttempted ?? "");
      const completed = Number(metrics.passesCompleted ?? "");
      if (
        metrics.passesAttempted &&
        metrics.passesCompleted &&
        completed > attempted
      ) {
        errors["metrics.passesCompleted"] =
          "Los pases completados no pueden superar los intentados.";
      }
    }

    if (positionGroup === "FORWARD") {
      const attempted = Number(metrics.crossesAttempted ?? "");
      const completed = Number(metrics.crossesCompleted ?? "");
      if (
        metrics.crossesAttempted &&
        metrics.crossesCompleted &&
        completed > attempted
      ) {
        errors["metrics.crossesCompleted"] =
          "Los centros completados no pueden superar los intentados.";
      }
    }

    if (positionGroup === "GOALKEEPER") {
      const conceded = toNullableNumber(metrics.goalsConceded ?? "");
      const opponentGoals = toNullableNumber(state.opponentGoals);
      if (
        conceded !== null &&
        opponentGoals !== null &&
        conceded !== opponentGoals
      ) {
        errors["metrics.goalsConceded"] =
          "Los goles recibidos no coinciden con los goles del rival.";
      }
      if (metrics.cleanSheet !== undefined && metrics.cleanSheet !== "") {
        const clean = metrics.cleanSheet === "true";
        if (conceded !== null && clean !== (conceded === 0)) {
          errors["metrics.cleanSheet"] =
            "La valla invicta no coincide con los goles recibidos.";
        }
      }
    }

    if (positionGroup === "FORWARD") {
      const metricGoals = toNullableNumber(metrics.goals ?? "");
      const playerGoals = toNullableNumber(state.playerGoals);
      if (
        metricGoals !== null &&
        playerGoals !== null &&
        metricGoals !== playerGoals
      ) {
        errors["metrics.goals"] =
          "Los goles posicionales deben coincidir con los goles generales.";
      }
      const metricAssists = toNullableNumber(metrics.assists ?? "");
      const assists = toNullableNumber(state.assists);
      if (
        metricAssists !== null &&
        assists !== null &&
        metricAssists !== assists
      ) {
        errors["metrics.assists"] =
          "Las asistencias posicionales deben coincidir con las generales.";
      }
    }

    if (positionGroup === "MIDFIELDER") {
      const metricAssists = toNullableNumber(metrics.assists ?? "");
      const assists = toNullableNumber(state.assists);
      if (
        metricAssists !== null &&
        assists !== null &&
        metricAssists !== assists
      ) {
        errors["metrics.assists"] =
          "Las asistencias posicionales deben coincidir con las generales.";
      }
    }

    if (mode === "edit" && !state.correctionReason.trim()) {
      errors.correctionReason = "Ingresa el motivo de la corrección.";
    } else if (
      mode === "edit" &&
      (state.correctionReason.trim().length < 5 ||
        state.correctionReason.trim().length > 500)
    ) {
      errors.correctionReason =
        "El motivo debe tener entre 5 y 500 caracteres.";
    }

    return errors;
  }

  function buildMetrics(): PlayerHistoryMetrics | null {
    if (didNotPlay || !positionGroup || metricDefinitions.length === 0) {
      return null;
    }

    const groupKey =
      positionGroup === "GOALKEEPER"
        ? "goalkeeper"
        : positionGroup === "DEFENDER"
          ? "defender"
          : positionGroup === "MIDFIELDER"
            ? "midfielder"
            : "forward";

    const values: Record<string, number | boolean | null> = {};
    let hasValue = false;

    for (const definition of metricDefinitions) {
      const raw = metrics[definition.key];
      if (raw === undefined || raw === "") {
        values[definition.key] = null;
        continue;
      }
      hasValue = true;
      values[definition.key] =
        definition.kind === "boolean" ? raw === "true" : Number(raw);
    }

    if (!hasValue) {
      return null;
    }

    return {
      [groupKey]: values,
    } as PlayerHistoryMetrics;
  }

  function buildRatings(): PlayerHistoryRatings | null {
    const hasValue = Object.values(ratings).some((value) => value.trim());
    if (!hasValue) {
      return null;
    }

    return {
      technical: toNullableNumber(ratings.technical),
      tactical: toNullableNumber(ratings.tactical),
      physical: toNullableNumber(ratings.physical),
      mental: toNullableNumber(ratings.mental),
      overall: toNullableNumber(ratings.overall),
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormError("Revisa los campos marcados e intenta nuevamente.");
      document.getElementById(Object.keys(errors)[0])?.focus();
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setIsSubmitting(true);

    const didNotPlay = state.participation === "DID_NOT_PLAY";
    const base: PlayerHistoryInput = {
      activityType: state.activityType as ActivityType,
      activityDate: state.activityDate,
      competition: toNullableString(state.competition),
      opponent: toNullableString(state.opponent),
      ageCategory: state.ageCategory
        ? (state.ageCategory as AgeCategory)
        : null,
      competitiveLevel: state.competitiveLevel
        ? (state.competitiveLevel as CompetitiveLevel)
        : null,
      positionPlayed: state.positionPlayed
        ? (state.positionPlayed as PlayerPosition)
        : null,
      participation: state.participation
        ? (state.participation as Participation)
        : null,
      minutesPlayed: didNotPlay
        ? 0
        : toNullableNumber(state.minutesPlayed),
      teamResult: matchLike
        ? state.teamResult
          ? (state.teamResult as TeamResult)
          : null
        : null,
      teamGoals: matchLike ? toNullableNumber(state.teamGoals) : null,
      opponentGoals: matchLike
        ? toNullableNumber(state.opponentGoals)
        : null,
      playerGoals: didNotPlay ? 0 : toNullableNumber(state.playerGoals),
      assists: didNotPlay ? 0 : toNullableNumber(state.assists),
      yellowCards: didNotPlay ? 0 : toNullableNumber(state.yellowCards),
      redCards: didNotPlay ? 0 : toNullableNumber(state.redCards),
      observations: toNullableString(state.observations),
      videoUrl: toNullableString(state.videoUrl),
      videoTimestampSeconds: toNullableNumber(state.videoTimestampSeconds),
      videoDescription: toNullableString(state.videoDescription),
      metrics: buildMetrics(),
      ratings: buildRatings(),
      strengths: toNullableString(state.strengths),
      improvements: toNullableString(state.improvements),
      recommendations: toNullableString(state.recommendations),
    };

    try {
      const payload =
        mode === "edit"
          ? ({
              ...base,
              expectedVersion: initial?.version ?? 0,
              correctionReason: state.correctionReason.trim(),
            } as PlayerHistoryCorrectionInput)
          : base;
      await onSubmit(payload);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          markSessionExpired();
          return;
        }
        if (error.fieldErrors) {
          setFieldErrors(error.fieldErrors);
          setFormError("Revisa los campos marcados e intenta nuevamente.");
        } else {
          setFormError(error.message);
        }
      } else {
        setFormError(
          "No se pudo guardar la entrada de historial. Intenta nuevamente.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      {formError ? (
        <Alert variant="error" title="No se pudo guardar">
          <p>{formError}</p>
        </Alert>
      ) : null}

      {warning}

      {mode === "edit" && initial?.author ? (
        <Alert variant="info" title="Corrección auditada">
          <p>
            Autor original: {initial.author.firstName} {initial.author.lastName}.
            La corrección conserva la autoría original, incrementa la revisión y
            no elimina la entrada.
          </p>
        </Alert>
      ) : null}

      <section className="formSection" aria-labelledby="history-activity">
        <h2 className="formSectionTitle" id="history-activity">
          Actividad
        </h2>
        <div className="formGrid">
          <SelectField
            label="Tipo de actividad"
            name="activityType"
            value={state.activityType}
            onChange={(event) => changeActivityType(event.target.value)}
            error={fieldErrors.activityType}
            disabled={isSubmitting}
            required
          >
            <option value="">Selecciona una opción</option>
            {ACTIVITY_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>

          <TextField
            label="Fecha de actividad"
            name="activityDate"
            type="date"
            value={state.activityDate}
            onChange={(event) => update("activityDate", event.target.value)}
            error={fieldErrors.activityDate}
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="formGrid">
          <TextField
            label="Competición"
            name="competition"
            value={state.competition}
            onChange={(event) => update("competition", event.target.value)}
            error={fieldErrors.competition}
            maxLength={150}
            disabled={isSubmitting}
          />
          <TextField
            label="Rival"
            name="opponent"
            value={state.opponent}
            onChange={(event) => update("opponent", event.target.value)}
            error={fieldErrors.opponent}
            maxLength={150}
            disabled={isSubmitting}
          />
        </div>

        <div className="formGrid">
          <SelectField
            label="Categoría de edad"
            name="ageCategory"
            value={state.ageCategory}
            onChange={(event) => update("ageCategory", event.target.value)}
            error={fieldErrors.ageCategory}
            disabled={isSubmitting}
          >
            <option value="">Sin categoría</option>
            {AGE_CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>

          <SelectField
            label="Nivel competitivo"
            name="competitiveLevel"
            value={state.competitiveLevel}
            onChange={(event) =>
              update("competitiveLevel", event.target.value)
            }
            error={fieldErrors.competitiveLevel}
            disabled={isSubmitting}
          >
            <option value="">Sin nivel</option>
            {COMPETITIVE_LEVEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </div>

        <div className="formGrid">
          <SelectField
            label="Posición jugada"
            name="positionPlayed"
            value={state.positionPlayed}
            onChange={(event) => changePosition(event.target.value)}
            error={fieldErrors.positionPlayed}
            disabled={isSubmitting}
          >
            <option value="">Sin posición</option>
            {POSITION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} ({option.group})
              </option>
            ))}
          </SelectField>

          <SelectField
            label="Participación"
            name="participation"
            value={state.participation}
            onChange={(event) => changeParticipation(event.target.value)}
            error={fieldErrors.participation}
            hint={
              didNotPlay
                ? "No jugó: minutos, goles, asistencias y tarjetas se registran en 0."
                : undefined
            }
            disabled={isSubmitting}
          >
            <option value="">Desconocida</option>
            {PARTICIPATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </div>
      </section>

      <section className="formSection" aria-labelledby="history-result">
        <h2 className="formSectionTitle" id="history-result">
          Resultado y estadísticas generales
        </h2>
        {matchLike ? (
          <>
            <div className="formGrid">
              <SelectField
                label="Resultado del equipo"
                name="teamResult"
                value={state.teamResult}
                onChange={(event) => update("teamResult", event.target.value)}
                error={fieldErrors.teamResult}
                disabled={isSubmitting}
                required
              >
                <option value="">Selecciona una opción</option>
                {TEAM_RESULT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectField>
              <TextField
                label="Goles del equipo"
                name="teamGoals"
                type="number"
                min={0}
                max={99}
                value={state.teamGoals}
                onChange={(event) => update("teamGoals", event.target.value)}
                error={fieldErrors.teamGoals}
                hint="Ambos marcadores o ninguno."
                disabled={isSubmitting}
              />
            </div>
            <TextField
              label="Goles del rival"
              name="opponentGoals"
              type="number"
              min={0}
              max={99}
              value={state.opponentGoals}
              onChange={(event) => update("opponentGoals", event.target.value)}
              error={fieldErrors.opponentGoals}
              disabled={isSubmitting}
            />
          </>
        ) : (
          <Alert variant="info" title="Actividad sin resultado">
            <p>
              Entrenamiento y prueba deportiva no admiten resultado ni marcador.
            </p>
          </Alert>
        )}

        <div className="formGrid">
          <TextField
            label="Minutos jugados"
            name="minutesPlayed"
            type="number"
            min={0}
            max={150}
            step={1}
            value={state.minutesPlayed}
            onChange={(event) => update("minutesPlayed", event.target.value)}
            error={fieldErrors.minutesPlayed}
            disabled={isSubmitting || didNotPlay}
          />
          <TextField
            label="Goles del jugador"
            name="playerGoals"
            type="number"
            min={0}
            max={99}
            value={state.playerGoals}
            onChange={(event) =>
              changeGeneralStat("playerGoals", event.target.value)
            }
            error={fieldErrors.playerGoals}
            hint="Se sincroniza con los goles posicionales si los registras."
            disabled={isSubmitting || didNotPlay}
          />
        </div>

        <div className="formGrid">
          <TextField
            label="Asistencias"
            name="assists"
            type="number"
            min={0}
            max={99}
            value={state.assists}
            onChange={(event) =>
              changeGeneralStat("assists", event.target.value)
            }
            error={fieldErrors.assists}
            hint="Se sincroniza con las asistencias posicionales si las registras."
            disabled={isSubmitting || didNotPlay}
          />
          <TextField
            label="Tarjetas amarillas"
            name="yellowCards"
            type="number"
            min={0}
            max={2}
            value={state.yellowCards}
            onChange={(event) => update("yellowCards", event.target.value)}
            error={fieldErrors.yellowCards}
            disabled={isSubmitting || didNotPlay}
          />
        </div>

        <TextField
          label="Tarjetas rojas"
          name="redCards"
          type="number"
          min={0}
          max={1}
          value={state.redCards}
          onChange={(event) => update("redCards", event.target.value)}
          error={fieldErrors.redCards}
          disabled={isSubmitting || didNotPlay}
        />
      </section>

      {positionGroup && metricDefinitions.length > 0 && !didNotPlay ? (
        <section className="formSection" aria-labelledby="history-metrics">
          <h2 className="formSectionTitle" id="history-metrics">
            Métricas de {positionGroupLabel(positionGroup)}
          </h2>
          <p className="formSectionNote">
            Opcionales. Corresponden al grupo de la posición jugada. Los goles y
            asistencias posicionales deben coincidir con los campos generales de
            goles y asistencias.
          </p>
          <div className="formGrid">
            {metricDefinitions.map((definition) =>
              definition.kind === "boolean" ? (
                <SelectField
                  key={definition.key}
                  label={definition.label}
                  name={`metrics.${definition.key}`}
                  value={metrics[definition.key] ?? ""}
                  onChange={(event) =>
                    changeMetric(definition.key, event.target.value)
                  }
                  error={fieldErrors[`metrics.${definition.key}`]}
                  disabled={isSubmitting}
                >
                  <option value="">Desconocido</option>
                  <option value="true">Sí</option>
                  <option value="false">No</option>
                </SelectField>
              ) : (
                <TextField
                  key={definition.key}
                  label={definition.label}
                  name={`metrics.${definition.key}`}
                  type="number"
                  min={0}
                  value={metrics[definition.key] ?? ""}
                  onChange={(event) =>
                    changeMetric(definition.key, event.target.value)
                  }
                  error={fieldErrors[`metrics.${definition.key}`]}
                  disabled={isSubmitting}
                />
              ),
            )}
          </div>
        </section>
      ) : null}

      <section className="formSection" aria-labelledby="history-video">
        <h2 className="formSectionTitle" id="history-video">
          Video y observaciones
        </h2>
        <TextField
          label="Enlace del video"
          name="videoUrl"
          type="url"
          value={state.videoUrl}
          onChange={(event) => update("videoUrl", event.target.value)}
          error={fieldErrors.videoUrl}
          hint="Opcional. Solo enlaces web."
          disabled={isSubmitting}
        />
        <div className="formGrid">
          <TextField
            label="Segundo del video"
            name="videoTimestampSeconds"
            type="number"
            min={0}
            max={86400}
            value={state.videoTimestampSeconds}
            onChange={(event) =>
              update("videoTimestampSeconds", event.target.value)
            }
            error={fieldErrors.videoTimestampSeconds}
            disabled={isSubmitting}
          />
          <TextField
            label="Descripción del video"
            name="videoDescription"
            value={state.videoDescription}
            onChange={(event) =>
              update("videoDescription", event.target.value)
            }
            error={fieldErrors.videoDescription}
            maxLength={500}
            disabled={isSubmitting}
          />
        </div>

        <TextAreaField
          label="Observaciones"
          name="observations"
          value={state.observations}
          onChange={(event) => update("observations", event.target.value)}
          error={fieldErrors.observations}
          maxLength={2000}
          rows={4}
          disabled={isSubmitting}
        />
      </section>

      <section className="formSection" aria-labelledby="history-ratings">
        <h2 className="formSectionTitle" id="history-ratings">
          Ratings (1 a 5)
        </h2>
        <p className="formSectionNote">
          Opcionales. Se muestran como desconocidos si se dejan vacíos.
        </p>
        <div className="formGrid">
          {(
            [
              ["technical", "Técnico"],
              ["tactical", "Táctico"],
              ["physical", "Físico"],
              ["mental", "Mental"],
              ["overall", "General"],
            ] as Array<[keyof RatingsState, string]>
          ).map(([key, label]) => (
            <SelectField
              key={key}
              label={label}
              name={`ratings.${key}`}
              value={ratings[key]}
              onChange={(event) =>
                setRatings((current) => ({
                  ...current,
                  [key]: event.target.value,
                }))
              }
              error={fieldErrors[`ratings.${key}`]}
              disabled={isSubmitting}
            >
              <option value="">Desconocido</option>
              {[1, 2, 3, 4, 5].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </SelectField>
          ))}
        </div>
      </section>

      <section className="formSection" aria-labelledby="history-comments">
        <h2 className="formSectionTitle" id="history-comments">
          Valoración
        </h2>
        <TextAreaField
          label="Fortalezas"
          name="strengths"
          value={state.strengths}
          onChange={(event) => update("strengths", event.target.value)}
          error={fieldErrors.strengths}
          maxLength={2000}
          rows={3}
          disabled={isSubmitting}
        />
        <TextAreaField
          label="Mejoras"
          name="improvements"
          value={state.improvements}
          onChange={(event) => update("improvements", event.target.value)}
          error={fieldErrors.improvements}
          maxLength={2000}
          rows={3}
          disabled={isSubmitting}
        />
        <TextAreaField
          label="Recomendaciones"
          name="recommendations"
          value={state.recommendations}
          onChange={(event) => update("recommendations", event.target.value)}
          error={fieldErrors.recommendations}
          maxLength={2000}
          rows={3}
          disabled={isSubmitting}
        />
      </section>

      {mode === "edit" ? (
        <section className="formSection" aria-labelledby="history-correction">
          <h2 className="formSectionTitle" id="history-correction">
            Motivo de corrección
          </h2>
          <p className="formSectionNote">
            Obligatorio. La corrección conserva al autor original y registra una
            nueva revisión. No se permite borrar la entrada.
          </p>
          <TextAreaField
            label="Motivo"
            name="correctionReason"
            value={state.correctionReason}
            onChange={(event) =>
              update("correctionReason", event.target.value)
            }
            error={fieldErrors.correctionReason}
            maxLength={500}
            rows={3}
            disabled={isSubmitting}
            required
          />
        </section>
      ) : null}

      <div className="formActions">
        <button
          className="button buttonPrimary"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? <Spinner /> : null}
          {isSubmitting ? "Guardando…" : submitLabel}
        </button>
        <Link className="button buttonSecondary" href={cancelHref}>
          Cancelar
        </Link>
      </div>

      <p className="footnote">
        {playerName} · El autor y la versión se registran automáticamente. No se
        admiten notas privadas de prospección en este historial.
      </p>
    </form>
  );
}
