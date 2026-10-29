/* eslint-disable @next/next/no-img-element */
"use client";

import { safeHttpUrl, verificationBadgeClass, verificationLabel } from "@/features/organizations/labels";
import {
  activityTypeLabel,
  ageCategoryLabel,
  competitiveLevelLabel,
  displayText,
  dominantFootLabel,
  formatHeight,
  formatResidence,
  formatWeight,
  metricDefinitionsForGroup,
  participationLabel,
  positionGroupLabel,
  positionLabel,
  teamResultLabel,
} from "@/features/jugadores/catalogs";
import { formatProspectDate } from "@/features/prospecciones/catalogs";
import type {
  PlayerHistoryMetrics,
  PositionGroup,
  RecommendationHistorySnapshot,
  RecommendationSnapshot,
} from "@/types/api";

function metricGroupKey(group: PositionGroup | null): string | null {
  if (group === "GOALKEEPER") {
    return "goalkeeper";
  }
  if (group === "DEFENDER") {
    return "defender";
  }
  if (group === "MIDFIELDER") {
    return "midfielder";
  }
  if (group === "FORWARD") {
    return "forward";
  }
  return null;
}

function metricValues(
  metrics: PlayerHistoryMetrics | null,
  group: PositionGroup | null,
): Record<string, number | boolean | null> | null {
  const key = metricGroupKey(group);
  if (!metrics || !key) {
    return null;
  }

  const data = metrics[key as keyof PlayerHistoryMetrics];
  return data ? (data as Record<string, number | boolean | null>) : null;
}

function SnapshotHistory({ entry }: { entry: RecommendationHistorySnapshot }) {
  const videoUrl = safeHttpUrl(entry.videoUrl);
  const values = metricValues(entry.metrics, entry.positionGroup);
  const definitions = metricDefinitionsForGroup(entry.positionGroup);
  const score =
    entry.teamGoals !== null && entry.opponentGoals !== null
      ? `${entry.teamGoals} - ${entry.opponentGoals}`
      : "—";

  return (
    <article className="prospectEvaluation">
      <div className="prospectEvaluationHeader">
        <div>
          <p className="detailCode">
            {formatProspectDate(entry.activityDate)} ·{" "}
            {activityTypeLabel(entry.activityType)}
          </p>
          <p className="cellMuted">
            {entry.opponent || "Sin rival"} · {entry.competition || "Sin competición"}
          </p>
        </div>
        <span className="statusBadge statusNeutral">
          {positionLabel(entry.positionPlayed)}
        </span>
      </div>

      <dl className="metaList sectionSpacer">
        <div>
          <dt>Categoría / nivel</dt>
          <dd>
            {ageCategoryLabel(entry.ageCategory)} ·{" "}
            {competitiveLevelLabel(entry.competitiveLevel)}
          </dd>
        </div>
        <div>
          <dt>Participación</dt>
          <dd>{participationLabel(entry.participation)}</dd>
        </div>
        <div>
          <dt>Minutos</dt>
          <dd>{entry.minutesPlayed ?? "—"}</dd>
        </div>
        <div>
          <dt>Resultado / marcador</dt>
          <dd>
            {teamResultLabel(entry.teamResult)} · {score}
          </dd>
        </div>
        <div>
          <dt>Goles / asistencias / tarjetas</dt>
          <dd>
            {entry.playerGoals ?? "—"} / {entry.assists ?? "—"} /{" "}
            {entry.yellowCards ?? "—"}A · {entry.redCards ?? "—"}R
          </dd>
        </div>
      </dl>

      {entry.observations ? (
        <div className="sectionSpacer">
          <h4 className="cardTitle">Observaciones</h4>
          <p className="preLine">{entry.observations}</p>
        </div>
      ) : null}

      {values && definitions.length > 0 ? (
        <div className="sectionSpacer">
          <h4 className="cardTitle">Métricas</h4>
          <div className="statGrid">
            {definitions.map((definition) => {
              const value = values[definition.key];
              if (value === null || value === undefined) {
                return null;
              }
              return (
                <div className="statItem" key={definition.key}>
                  <span className="statValue">
                    {typeof value === "boolean" ? (value ? "Sí" : "No") : value}
                  </span>
                  <span className="statLabel">{definition.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {entry.ratings ? (
        <div className="sectionSpacer">
          <h4 className="cardTitle">Ratings</h4>
          <div className="statGrid">
            <RatingItem label="Técnico" value={entry.ratings.technical} />
            <RatingItem label="Táctico" value={entry.ratings.tactical} />
            <RatingItem label="Físico" value={entry.ratings.physical} />
            <RatingItem label="Mental" value={entry.ratings.mental} />
            <RatingItem label="General" value={entry.ratings.overall} />
          </div>
        </div>
      ) : null}

      <div className="detailGrid sectionSpacer">
        <TextBlock title="Fortalezas" value={entry.strengths} />
        <TextBlock title="Mejoras" value={entry.improvements} />
        <TextBlock title="Recomendaciones" value={entry.recommendations} />
      </div>

      {videoUrl ? (
        <p className="sectionSpacer">
          <a
            className="button buttonSecondary buttonSmall"
            href={videoUrl}
            target="_blank"
            rel="noreferrer noopener"
          >
            Ver video
          </a>
        </p>
      ) : null}
    </article>
  );
}

function RatingItem({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  return (
    <div className="statItem">
      <span className="statValue">{value ?? "—"}</span>
      <span className="statLabel">{label}</span>
    </div>
  );
}

function TextBlock({ title, value }: { title: string; value: string | null }) {
  return (
    <div>
      <h4 className="cardTitle">{title}</h4>
      <p className="preLine">{displayText(value)}</p>
    </div>
  );
}

export function RecommendationSnapshotView({
  snapshot,
}: {
  snapshot: RecommendationSnapshot;
}) {
  const player = snapshot.player;
  const photoUrl = safeHttpUrl(player.photoUrl);
  const academy = player.academy;
  const initials =
    `${player.firstName} ${player.lastName}`
      .trim()
      .split(/\s+/)
      .map((part) => part.charAt(0))
      .slice(0, 2)
      .join("")
      .toUpperCase() || "JP";

  return (
    <section className="card sectionSpacer" aria-labelledby="recommendation-snapshot">
      <h2 className="cardTitle" id="recommendation-snapshot">
        Resumen compartido
      </h2>
      <p className="formSectionNote">
        Copia de lo compartido al club al momento del envío. No contiene fecha de
        nacimiento, distrito, tutor, cuenta ni notas privadas.
      </p>

      <div className="detailIdentity sectionSpacer">
        {photoUrl ? (
          <img
            className="detailLogo"
            src={photoUrl}
            alt={`Foto de ${player.firstName} ${player.lastName}`}
          />
        ) : (
          <span className="detailLogoFallback" aria-hidden="true">
            {initials}
          </span>
        )}
        <div>
          <p className="detailCode">Jugador</p>
          <h3 className="detailTitle">
            {player.firstName} {player.lastName}
          </h3>
          <p className="detailMeta">
            {player.age ?? "—"} años · {positionLabel(player.position)} ·{" "}
            {positionGroupLabel(player.positionGroup)}
          </p>
          {academy ? (
            <div className="badgeRow sectionSpacer">
              <span className={verificationBadgeClass(academy.verificationStatus)}>
                {verificationLabel(academy.verificationStatus)}
              </span>
              <span className="statusBadge statusNeutral">{academy.name}</span>
            </div>
          ) : null}
        </div>
      </div>

      <dl className="metaList sectionSpacer">
        <div>
          <dt>Mejor posición</dt>
          <dd>
            {positionLabel(player.bestPosition)}
            {player.bestPositionGroup
              ? ` · ${positionGroupLabel(player.bestPositionGroup)}`
              : ""}
          </dd>
        </div>
        <div>
          <dt>Pie dominante</dt>
          <dd>{dominantFootLabel(player.dominantFoot)}</dd>
        </div>
        <div>
          <dt>Talla / peso</dt>
          <dd>
            {formatHeight(player.heightCm)} · {formatWeight(player.weightKg)}
          </dd>
        </div>
        <div>
          <dt>Residencia</dt>
          <dd>{formatResidence(snapshot.residence, false)}</dd>
        </div>
      </dl>

      {player.summary ? (
        <div className="sectionSpacer">
          <h4 className="cardTitle">Resumen deportivo</h4>
          <p className="preLine">{player.summary}</p>
        </div>
      ) : null}

      <div className="sectionSpacer">
        <h3 className="cardTitle">Historial seleccionado</h3>
        {snapshot.historyEntries.length === 0 ? (
          <p>No se compartieron historiales.</p>
        ) : (
          <div className="prospectEvaluationList">
            {snapshot.historyEntries.map((entry) => (
              <SnapshotHistory entry={entry} key={entry.id} />
            ))}
          </div>
        )}
      </div>

      <div className="sectionSpacer">
        <h3 className="cardTitle">Evaluaciones seleccionadas</h3>
        {snapshot.evaluations.length === 0 ? (
          <p>No se compartieron evaluaciones.</p>
        ) : (
          <div className="prospectEvaluationList">
            {snapshot.evaluations.map((evaluation) => {
              const videoUrl = safeHttpUrl(evaluation.videoUrl);
              return (
                <article className="prospectEvaluation" key={evaluation.id}>
                  <p className="detailCode">
                    Evaluación del {formatProspectDate(evaluation.evaluatedAt)}
                  </p>
                  <div className="statGrid sectionSpacer">
                    <RatingItem
                      label="Técnico"
                      value={evaluation.technicalRating}
                    />
                    <RatingItem
                      label="Táctico"
                      value={evaluation.tacticalRating}
                    />
                    <RatingItem
                      label="Físico"
                      value={evaluation.physicalRating}
                    />
                    <RatingItem
                      label="Mental"
                      value={evaluation.mentalRating}
                    />
                    <RatingItem
                      label="General"
                      value={evaluation.overallRating}
                    />
                  </div>
                  <div className="detailGrid sectionSpacer">
                    <TextBlock title="Fortalezas" value={evaluation.strengths} />
                    <TextBlock title="Mejoras" value={evaluation.improvements} />
                    <TextBlock
                      title="Recomendación"
                      value={evaluation.recommendation}
                    />
                  </div>
                  {videoUrl ? (
                    <p className="sectionSpacer">
                      <a
                        className="button buttonSecondary buttonSmall"
                        href={videoUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        Ver video
                      </a>
                    </p>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
