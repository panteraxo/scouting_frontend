/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { safeHttpUrl } from "@/features/organizations/labels";
import type { ProspectPlayerSummary } from "@/types/api";
import {
  formatProspectAge,
  prospectPlayerName,
} from "../catalogs";
import { positionLabel } from "@/features/jugadores/catalogs";

function verificationLabel(
  status: "PENDING_VERIFICATION" | "VERIFIED" | "REJECTED",
): string {
  if (status === "VERIFIED") {
    return "Verificada";
  }
  if (status === "REJECTED") {
    return "Rechazada";
  }
  return "Pendiente de verificación";
}

function verificationClass(
  status: "PENDING_VERIFICATION" | "VERIFIED" | "REJECTED",
): string {
  if (status === "VERIFIED") {
    return "statusBadge statusVerified";
  }
  if (status === "REJECTED") {
    return "statusBadge statusRejected";
  }
  return "statusBadge statusPending";
}

export function ProspectPlayerSummaryCard({
  player,
}: {
  player: ProspectPlayerSummary;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const fullName = prospectPlayerName(player);
  const photoUrl = safeHttpUrl(player.photoUrl);
  const showPhoto = Boolean(photoUrl) && !imageFailed;
  const initials =
    fullName
      .split(/\s+/)
      .map((part) => part.charAt(0))
      .slice(0, 2)
      .join("")
      .toUpperCase() || "JP";

  return (
    <section className="card" aria-labelledby="prospect-player-summary">
      <div className="detailIdentity">
        {showPhoto && photoUrl ? (
          <img
            className="detailLogo"
            src={photoUrl}
            alt={`Foto de ${fullName}`}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span className="detailLogoFallback" aria-hidden="true">
            {initials}
          </span>
        )}
        <div>
          <p className="detailCode">Jugador</p>
          <h2 className="detailTitle" id="prospect-player-summary">
            {fullName}
          </h2>
          <p className="detailMeta">
            {formatProspectAge(player.age)} · {positionLabel(player.position)} ·{" "}
            {player.academy?.name ?? "Sin academia"}
          </p>
          {player.academy ? (
            <div className="badgeRow sectionSpacer">
              <span className={verificationClass(player.academy.verificationStatus)}>
                {verificationLabel(player.academy.verificationStatus)}
              </span>
            </div>
          ) : null}
        </div>
      </div>
      <p className="footnote">
        Resumen deportivo sin fecha de nacimiento, residencia ni datos personales
        de la cuenta. Los datos del tutor se muestran en la tarjeta «Datos del
        tutor» cuando el jugador es menor de edad. La verificación de la academia
        no impide la prospección si está operativamente activa.
      </p>
    </section>
  );
}
