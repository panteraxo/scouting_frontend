"use client";

import { useId } from "react";
import type { PlayerPosition } from "@/types/api";
import { positionLabel } from "../catalogs";

const SHORT_LABELS: Record<PlayerPosition, string> = {
  GOALKEEPER: "ARQ",
  CENTER_BACK: "DFC",
  FULL_BACK: "LAT",
  WING_BACK: "CAR",
  DEFENSIVE_MIDFIELDER: "MCD",
  CENTRAL_MIDFIELDER: "MC",
  ATTACKING_MIDFIELDER: "MCO",
  LEFT_MIDFIELDER: "MI",
  RIGHT_MIDFIELDER: "MD",
  LEFT_WINGER: "EI",
  RIGHT_WINGER: "ED",
  SECOND_STRIKER: "SD",
  STRIKER: "DC",
};

/**
 * Coordenadas sobre la cancha (viewBox 120 x 168). El equipo ataca hacia
 * arriba, por lo que el arco propio queda abajo.
 */
const POSITION_COORDINATES: Record<PlayerPosition, { x: number; y: number }> = {
  GOALKEEPER: { x: 60, y: 148 },
  CENTER_BACK: { x: 46, y: 130 },
  FULL_BACK: { x: 20, y: 124 },
  WING_BACK: { x: 16, y: 104 },
  DEFENSIVE_MIDFIELDER: { x: 60, y: 114 },
  CENTRAL_MIDFIELDER: { x: 60, y: 90 },
  ATTACKING_MIDFIELDER: { x: 60, y: 66 },
  LEFT_MIDFIELDER: { x: 28, y: 80 },
  RIGHT_MIDFIELDER: { x: 92, y: 80 },
  LEFT_WINGER: { x: 22, y: 44 },
  RIGHT_WINGER: { x: 98, y: 44 },
  SECOND_STRIKER: { x: 60, y: 40 },
  STRIKER: { x: 60, y: 22 },
};

export function PlayerPositionPitch({
  position,
}: {
  position: PlayerPosition | null;
}) {
  const coordinates = position ? POSITION_COORDINATES[position] : null;
  const grassId = `pitch-grass-${useId().replace(/:/g, "")}`;

  return (
    <figure className="playerPitch">
      <svg
        className="playerPitchSvg"
        viewBox="0 0 120 168"
        role="img"
        aria-label={
          position
            ? `Cancha de fútbol con la posición ${positionLabel(position)} resaltada`
            : "Cancha de fútbol sin posición registrada"
        }
      >
        <defs>
          <linearGradient id={grassId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1f7f4e" />
            <stop offset="100%" stopColor="#145c39" />
          </linearGradient>
        </defs>

        <rect
          x="4"
          y="4"
          width="112"
          height="160"
          rx="3"
          fill={`url(#${grassId})`}
          stroke="#ffffff"
          strokeOpacity="0.85"
          strokeWidth="1.4"
        />

        {[0, 1, 2, 3, 4, 5, 6, 7].map((stripe) => (
          <rect
            key={stripe}
            x="4"
            y={4 + stripe * 20}
            width="112"
            height="10"
            fill="#ffffff"
            opacity="0.05"
          />
        ))}

        <g
          fill="none"
          stroke="#ffffff"
          strokeOpacity="0.85"
          strokeWidth="1.3"
        >
          <line x1="4" y1="84" x2="116" y2="84" />
          <circle cx="60" cy="84" r="15" />
          <rect x="30" y="4" width="60" height="20" />
          <rect x="46" y="4" width="28" height="8" />
          <rect x="30" y="144" width="60" height="20" />
          <rect x="46" y="156" width="28" height="8" />
          <rect x="52" y="1" width="16" height="3" />
          <rect x="52" y="164" width="16" height="3" />
        </g>

        <g fill="#ffffff" fillOpacity="0.85">
          <circle cx="60" cy="84" r="1.4" />
          <circle cx="60" cy="17" r="1.4" />
          <circle cx="60" cy="151" r="1.4" />
        </g>

        {coordinates && position ? (
          <g>
            <circle
              cx={coordinates.x}
              cy={coordinates.y}
              r="13"
              fill="#ffd166"
              opacity="0.25"
            />
            <circle
              cx={coordinates.x}
              cy={coordinates.y}
              r="10"
              fill="#ffd166"
              stroke="#0b1d32"
              strokeWidth="1.4"
            />
            <text
              x={coordinates.x}
              y={coordinates.y + 2.6}
              textAnchor="middle"
              fontSize="7"
              fontWeight="800"
              fill="#0b1d32"
            >
              {SHORT_LABELS[position]}
            </text>
          </g>
        ) : null}
      </svg>
    </figure>
  );
}
