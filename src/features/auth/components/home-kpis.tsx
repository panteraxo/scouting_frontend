"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { listScoutRegistrations } from "@/features/admin/scout-registrations-api";
import { getMyPlayer, getPlayerStats, listPlayers } from "@/features/jugadores/players-api";
import {
  listAdminOrganizations,
  listDirectoryOrganizations,
} from "@/features/organizations/organizations-api";
import { listProspects } from "@/features/prospecciones/prospects-api";
import {
  listAdminRecommendations,
  listClubRecommendations,
} from "@/features/recomendaciones/recommendations-api";
import { listUsers } from "@/features/usuarios/api";
import { ApiError, isAbortError } from "@/lib/api-client";
import type { PlayerStats, UserRole } from "@/types/api";
import { useAuth } from "../auth-provider";

interface KpiSpec {
  key: string;
  label: string;
  href: string;
  load: (signal: AbortSignal) => Promise<number | null>;
}

const FIRST_PAGE = { page: 0, size: 1 };

function totalOf(page: { totalElements: number }): number {
  return page.totalElements;
}

/**
 * Indicadores del inicio por rol. Todos se calculan con `totalElements` de los
 * listados existentes, así que no requieren endpoints nuevos en el backend.
 */
function kpiSpecs(role: UserRole): KpiSpec[] {
  switch (role) {
    case "ADMIN":
      return [
        {
          key: "users",
          label: "Usuarios",
          href: "/admin/usuarios",
          load: (signal) => listUsers(FIRST_PAGE, signal).then(totalOf),
        },
        {
          key: "academies",
          label: "Academias",
          href: "/admin/academias",
          load: (signal) =>
            listAdminOrganizations("academy", FIRST_PAGE, signal).then(totalOf),
        },
        {
          key: "clubs",
          label: "Clubes",
          href: "/admin/clubes",
          load: (signal) =>
            listAdminOrganizations("club", FIRST_PAGE, signal).then(totalOf),
        },
        {
          key: "scoutRequests",
          label: "Solicitudes de ojeador",
          href: "/admin/solicitudes-ojeador",
          load: (signal) =>
            listScoutRegistrations(
              { status: "PENDING_APPROVAL", ...FIRST_PAGE },
              signal,
            ).then(totalOf),
        },
        {
          key: "recommendations",
          label: "Recomendaciones",
          href: "/admin/recomendaciones",
          load: (signal) =>
            listAdminRecommendations(FIRST_PAGE, signal).then(totalOf),
        },
      ];
    case "SCOUT":
      return [
        {
          key: "players",
          label: "Jugadores",
          href: "/jugadores",
          load: (signal) => listPlayers(FIRST_PAGE, signal).then(totalOf),
        },
        {
          key: "prospects",
          label: "Prospecciones",
          href: "/prospecciones",
          load: (signal) => listProspects(FIRST_PAGE, signal).then(totalOf),
        },
        {
          key: "academies",
          label: "Academias",
          href: "/academias",
          load: (signal) =>
            listDirectoryOrganizations("academy", FIRST_PAGE, signal).then(
              totalOf,
            ),
        },
        {
          key: "clubs",
          label: "Clubes",
          href: "/clubes",
          load: (signal) =>
            listDirectoryOrganizations("club", FIRST_PAGE, signal).then(
              totalOf,
            ),
        },
      ];
    case "PROFESSOR":
    case "ACADEMY_DIRECTOR":
      return [
        {
          key: "players",
          label: "Jugadores",
          href: "/jugadores",
          load: (signal) => listPlayers(FIRST_PAGE, signal).then(totalOf),
        },
        {
          key: "completeProfiles",
          label: "Perfiles completos",
          href: "/jugadores",
          load: (signal) =>
            listPlayers(
              { ...FIRST_PAGE, profileStatus: "COMPLETE" },
              signal,
            ).then(totalOf),
        },
        {
          key: "incompleteProfiles",
          label: "Perfiles incompletos",
          href: "/jugadores",
          load: (signal) =>
            listPlayers(
              { ...FIRST_PAGE, profileStatus: "INCOMPLETE" },
              signal,
            ).then(totalOf),
        },
      ];
    case "CLUB_MANAGER":
      return [
        {
          key: "recommendations",
          label: "Recomendaciones",
          href: "/mi-club/recomendaciones",
          load: (signal) =>
            listClubRecommendations(FIRST_PAGE, signal).then(totalOf),
        },
      ];
    case "PLAYER": {
      // Una sola carga de estadísticas compartida por todos los indicadores.
      let stats: Promise<PlayerStats> | null = null;
      const loadStats = (signal: AbortSignal) => {
        stats ??= getMyPlayer(signal).then((player) =>
          getPlayerStats(player.id, signal),
        );
        return stats;
      };

      return [
        {
          key: "matches",
          label: "Partidos jugados",
          href: "/mi-perfil",
          load: async (signal) =>
            (await loadStats(signal)).career.matchesPlayed.value,
        },
        {
          key: "goals",
          label: "Goles",
          href: "/mi-perfil",
          load: async (signal) => (await loadStats(signal)).career.goals.value,
        },
        {
          key: "assists",
          label: "Asistencias",
          href: "/mi-perfil",
          load: async (signal) =>
            (await loadStats(signal)).career.assists.value,
        },
        {
          key: "minutes",
          label: "Minutos jugados",
          href: "/mi-perfil",
          load: async (signal) => (await loadStats(signal)).career.minutes.value,
        },
      ];
    }
  }
}

const numberFormatter = new Intl.NumberFormat("es-PE");

export function HomeKpis() {
  const { user, markSessionExpired } = useAuth();
  const role = user?.role;
  const specs = useMemo(() => (role ? kpiSpecs(role) : []), [role]);
  const [loaded, setLoaded] = useState<{
    role: UserRole;
    values: Record<string, number | null>;
  } | null>(null);

  useEffect(() => {
    if (!role || specs.length === 0) {
      return;
    }

    const controller = new AbortController();
    let isActive = true;

    Promise.allSettled(specs.map((spec) => spec.load(controller.signal))).then(
      (results) => {
        if (!isActive) {
          return;
        }

        const values: Record<string, number | null> = {};
        let sessionExpired = false;

        results.forEach((result, index) => {
          const key = specs[index].key;

          if (result.status === "fulfilled") {
            values[key] = result.value;
            return;
          }

          values[key] = null;

          if (
            !isAbortError(result.reason) &&
            result.reason instanceof ApiError &&
            result.reason.status === 401
          ) {
            sessionExpired = true;
          }
        });

        if (sessionExpired) {
          markSessionExpired();
          return;
        }

        setLoaded({ role, values });
      },
    );

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [role, specs, markSessionExpired]);

  if (!role || specs.length === 0) {
    return null;
  }

  const values = loaded?.role === role ? loaded.values : {};
  const isLoading = loaded?.role !== role;

  return (
    <section className="kpiSection" aria-labelledby="kpis-title">
      <h2 className="sectionTitle" id="kpis-title">
        Resumen
      </h2>
      <ul className="kpiGrid" aria-busy={isLoading}>
        {specs.map((spec) => {
          const value = values[spec.key];

          return (
            <li key={spec.key}>
              <Link className="kpiCard" href={spec.href}>
                <span className="kpiValue">
                  {typeof value === "number"
                    ? numberFormatter.format(value)
                    : "—"}
                </span>
                <span className="kpiLabel">{spec.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
