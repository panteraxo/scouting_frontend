"use client";

import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import type {
  PlayerDetailResponse,
  PlayerOperationalStatus,
  PlayerProfileStatus,
  UserRole,
} from "@/types/api";
import {
  consentStatusLabel,
  displayText,
  dominantFootLabel,
  formatAge,
  formatDateTime,
  formatExperience,
  formatHeight,
  formatResidence,
  formatWeight,
  GUARDIAN_DATA_STATUS_LABELS,
  OPERATIONAL_STATUS_LABELS,
  positionGroupLabel,
  positionLabel,
  PROFILE_STATUS_LABELS,
} from "../catalogs";
import { playerGuardianPath } from "../routes";

function playerStatusBadge(status: PlayerOperationalStatus): string {
  return status === "ACTIVE"
    ? "statusBadge statusActive"
    : "statusBadge statusInactive";
}

function profileStatusBadge(status: PlayerProfileStatus): string {
  return status === "COMPLETE"
    ? "statusBadge statusVerified"
    : "statusBadge statusPending";
}

function academyVerificationLabel(
  status: "PENDING_VERIFICATION" | "VERIFIED" | "REJECTED",
): string {
  if (status === "VERIFIED") {
    return "Academia verificada";
  }
  if (status === "REJECTED") {
    return "Academia rechazada";
  }
  return "Academia pendiente de verificación";
}

export function PlayerSummary({
  player,
  role,
}: {
  player: PlayerDetailResponse;
  role: UserRole;
}) {
  const fullResponse = "birthDate" in player ? player : null;
  const statusResponse = "operationalStatus" in player ? player : null;
  const staffResponse = "guardianDataStatus" in player ? player : null;
  const scoutResponse = "guardianDataAvailable" in player ? player : null;
  const academy = player.academy;

  return (
    <div className="playerSummary">
      {role === "SCOUT" &&
      academy &&
      academy.verificationStatus !== "VERIFIED" ? (
        <Alert variant="warning" title="Estado de la academia">
          <p>
            {academyVerificationLabel(academy.verificationStatus)}. El perfil
            puede consultarse porque la academia está operativamente activa, pero
            la ficha debe interpretarse con ese estado de verificación.
          </p>
        </Alert>
      ) : null}

      <div className="playerSummaryGrid">
        <section
          className="card playerSummaryCard"
          aria-labelledby="player-data-title"
        >
          <h2 className="cardTitle" id="player-data-title">
            Información general
          </h2>
          <dl className="metaList">
            <div>
              <dt>Edad</dt>
              <dd>{formatAge(player.age)}</dd>
            </div>
            {fullResponse ? (
              <div>
                <dt>Fecha de nacimiento</dt>
                <dd>{formatDateSafe(fullResponse.birthDate)}</dd>
              </div>
            ) : null}
            <div>
              <dt>Talla</dt>
              <dd>{formatHeight(player.heightCm)}</dd>
            </div>
            <div>
              <dt>Peso</dt>
              <dd>{formatWeight(player.weightKg)}</dd>
            </div>
            <div>
              <dt>Pie dominante</dt>
              <dd>{dominantFootLabel(player.dominantFoot)}</dd>
            </div>
            <div>
              <dt>Experiencia</dt>
              <dd>{formatExperience(player.yearsExperience)}</dd>
            </div>
          </dl>
        </section>

        <section
          className="card playerSummaryCard"
          aria-labelledby="player-profile-title"
        >
          <h2 className="cardTitle" id="player-profile-title">
            Perfil del jugador
          </h2>
          <dl className="metaList">
            <div>
              <dt>Posición</dt>
              <dd>{positionLabel(player.position)}</dd>
            </div>
            <div>
              <dt>Grupo</dt>
              <dd>{positionGroupLabel(player.positionGroup)}</dd>
            </div>
            <div>
              <dt>Mejor posición</dt>
              <dd>{positionLabel(player.bestPosition)}</dd>
            </div>
          </dl>
          <div className="summaryBlock">
            <h3 className="summaryBlockTitle">Resumen deportivo</h3>
            {player.summary ? (
              <p className="preLine playerSummaryText">{player.summary}</p>
            ) : (
              <p className="cellMuted">Sin resumen registrado.</p>
            )}
          </div>
        </section>

        <section
          className="card playerSummaryCard"
          aria-labelledby="player-location-title"
        >
          <h2 className="cardTitle" id="player-location-title">
            Academia y residencia
          </h2>
          <dl className="metaList">
            <div>
              <dt>Academia</dt>
              <dd>{academy ? academy.name : "Sin academia"}</dd>
            </div>
            <div>
              <dt>Código</dt>
              <dd>{academy ? academy.code : "—"}</dd>
            </div>
            <div>
              <dt>Residencia</dt>
              <dd>{formatResidence(player.residence, role !== "SCOUT")}</dd>
            </div>
            {statusResponse ? (
              <>
                <div>
                  <dt>Estado operativo</dt>
                  <dd>
                    <span
                      className={playerStatusBadge(
                        statusResponse.operationalStatus,
                      )}
                    >
                      {OPERATIONAL_STATUS_LABELS[
                        statusResponse.operationalStatus
                      ]}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt>Estado del perfil</dt>
                  <dd>
                    <span
                      className={profileStatusBadge(
                        statusResponse.profileStatus,
                      )}
                    >
                      {PROFILE_STATUS_LABELS[statusResponse.profileStatus]}
                    </span>
                  </dd>
                </div>
              </>
            ) : null}
          </dl>
        </section>

        {staffResponse ? (
          <section
            className="card playerSummaryCard"
            aria-labelledby="player-guardian-title"
          >
            <h2 className="cardTitle" id="player-guardian-title">
              Tutor y consentimiento
            </h2>
            <dl className="metaList">
              <div>
                <dt>Datos del tutor</dt>
                <dd>
                  {GUARDIAN_DATA_STATUS_LABELS[
                    staffResponse.guardianDataStatus
                  ]}
                </dd>
              </div>
              <div>
                <dt>Consentimiento</dt>
                <dd>
                  {consentStatusLabel(staffResponse.guardianConsentStatus)}
                </dd>
              </div>
            </dl>
            <Link
              className="button buttonSecondary buttonSmall cardAction"
              href={playerGuardianPath(player.id)}
            >
              Ver ficha del tutor
            </Link>
          </section>
        ) : null}

        {scoutResponse ? (
          <section
            className="card playerSummaryCard"
            aria-labelledby="player-guardian-scout-title"
          >
            <h2 className="cardTitle" id="player-guardian-scout-title">
              Tutor
            </h2>
            <p className="formSectionNote">
              {scoutResponse.guardianDataAvailable
                ? "El tutor está registrado. La información se consulta en la ficha del tutor."
                : "No hay datos de tutor disponibles para este perfil."}
            </p>
            {scoutResponse.guardianDataAvailable ? (
              <Link
                className="button buttonSecondary buttonSmall cardAction"
                href={playerGuardianPath(player.id)}
              >
                Consultar tutor
              </Link>
            ) : null}
          </section>
        ) : null}

        {role === "ADMIN" && "guardianRequired" in player ? (
          <section
            className="card playerSummaryCard"
            aria-labelledby="player-guardian-note-title"
          >
            <h2 className="cardTitle" id="player-guardian-note-title">
              Nota del tutor
            </h2>
            <p className="playerSummaryText">
              {player.guardianRequired
                ? "El jugador es menor. El tutor lo registra el Profesor o Director de la academia; el Administrador no accede a esos datos."
                : "Jugador mayor de edad: no aplica tutor."}
            </p>
          </section>
        ) : null}

        {fullResponse ? (
          <section
            className="card playerSummaryCard"
            aria-labelledby="player-audit-title"
          >
            <h2 className="cardTitle" id="player-audit-title">
              Trazabilidad
            </h2>
            <dl className="metaList">
              <div>
                <dt>Creado</dt>
                <dd>{formatDateTime(fullResponse.createdAt)}</dd>
              </div>
              <div>
                <dt>Actualizado</dt>
                <dd>{formatDateTime(fullResponse.updatedAt)}</dd>
              </div>
            </dl>
            <p className="formSectionNote">
              Resumen del perfil deportivo. Las evaluaciones y notas privadas de
              prospección solo se muestran al ojeador autor en Trayectoria.
            </p>
          </section>
        ) : null}
      </div>

      <p className="footnote">
        Resumen del perfil deportivo. Las evaluaciones y notas privadas de
        prospección solo se muestran al ojeador autor en Trayectoria. Residencia:{" "}
        {displayText(player.residence?.departmentName)}
        {player.residence?.provinceName
          ? ` · ${player.residence.provinceName}`
          : ""}
        {role !== "SCOUT" && player.residence?.districtName
          ? ` · ${player.residence.districtName}`
          : ""}
        .
      </p>
    </div>
  );
}

function formatDateSafe(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeZone: "America/Lima",
  }).format(date);
}
