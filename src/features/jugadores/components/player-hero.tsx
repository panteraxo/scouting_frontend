/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, type ReactNode } from "react";
import {
  safeHttpUrl,
  verificationBadgeClass,
  verificationLabel,
} from "@/features/organizations/labels";
import type {
  PlayerDetailResponse,
  PlayerOperationalStatus,
  PlayerProfileStatus,
  UserRole,
} from "@/types/api";
import {
  formatAge,
  formatExperience,
  formatResidence,
  OPERATIONAL_STATUS_LABELS,
  playerFullName,
  positionGroupLabel,
  positionLabel,
  PROFILE_STATUS_LABELS,
} from "../catalogs";

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

function initialsOf(fullName: string): string {
  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return initials || "JP";
}

export function PlayerHero({
  player,
  role,
  mode,
  actions,
}: {
  player: PlayerDetailResponse;
  role: UserRole;
  mode: "directory" | "own";
  actions?: ReactNode;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const fullName = playerFullName(player);
  const photoUrl = safeHttpUrl(player.photoUrl);
  const academy = player.academy;
  const isScout = role === "SCOUT";
  const statusResponse =
    "operationalStatus" in player ? player : null;
  const position = player.position ? positionLabel(player.position) : null;
  const group = player.positionGroup
    ? positionGroupLabel(player.positionGroup)
    : null;
  const bestPosition = player.bestPosition
    ? positionLabel(player.bestPosition)
    : null;

  return (
    <section className="playerHero" aria-labelledby="player-hero-title">
      <div className="playerHeroMedia">
        {photoUrl && !imageFailed ? (
          <img
            className="playerHeroPhoto"
            src={photoUrl}
            alt={`Foto de ${fullName}`}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span className="playerHeroPhotoFallback" aria-hidden="true">
            {initialsOf(fullName)}
          </span>
        )}
      </div>

      <div className="playerHeroInfo">
        <p className="eyebrow">
          {mode === "own" ? "MI PERFIL" : "FICHA DEL JUGADOR"}
        </p>
        <h1 className="playerHeroName" id="player-hero-title">
          {fullName}
        </h1>
        <p className="playerHeroMeta">
          {formatAge(player.age)} ·{" "}
          {formatExperience(player.yearsExperience)} de experiencia ·{" "}
          {formatResidence(player.residence, !isScout)}
        </p>
        <p className="playerHeroMeta">
          {academy
            ? `${academy.name} (${academy.code})`
            : "Sin academia asociada"}
        </p>

        <div className="playerHeroTags">
          {position ? <span className="heroTag">{position}</span> : null}
          {group ? <span className="heroTag">{group}</span> : null}
          {bestPosition ? (
            <span className="heroTag">Mejor posición: {bestPosition}</span>
          ) : null}
          {statusResponse ? (
            <>
              <span
                className={playerStatusBadge(
                  statusResponse.operationalStatus,
                )}
              >
                {OPERATIONAL_STATUS_LABELS[
                  statusResponse.operationalStatus
                ]}
              </span>
              <span
                className={profileStatusBadge(
                  statusResponse.profileStatus,
                )}
              >
                Perfil {PROFILE_STATUS_LABELS[statusResponse.profileStatus]}
              </span>
            </>
          ) : null}
          {isScout && academy ? (
            <span
              className={verificationBadgeClass(
                academy.verificationStatus,
              )}
            >
              {verificationLabel(academy.verificationStatus)}
            </span>
          ) : null}
          {isScout &&
          academy &&
          academy.operationalStatus === "INACTIVE" ? (
            <span className="statusBadge statusInactive">
              Academia inhabilitada
            </span>
          ) : null}
        </div>
      </div>

      {actions ? <div className="playerHeroActions">{actions}</div> : null}
    </section>
  );
}
