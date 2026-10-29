"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { InlineLoading } from "@/components/ui/loading";
import { useAuth } from "@/features/auth/auth-provider";
import { ApiError, isAbortError } from "@/lib/api-client";
import type {
  PlayerActivityTypeStats,
  PlayerStatAverage,
  PlayerStatCount,
  PlayerStats,
  PlayerStatsTotals,
} from "@/types/api";
import { getPlayerStats } from "../players-api";
import {
  activityTypeLabel,
  formatCoverage,
  formatStatAverage,
  formatStatCount,
  positionGroupLabel,
  positionLabel,
} from "../catalogs";

function Coverage({ stat }: { stat: PlayerStatCount | PlayerStatAverage }) {
  return <span className="statCoverage">{formatCoverage(stat)}</span>;
}

function CountCell({
  stat,
  label,
}: {
  stat: PlayerStatCount | null | undefined;
  label: string;
}) {
  return (
    <div className="statItem">
      <span className="statValue">{formatStatCount(stat)}</span>
      <span className="statLabel">{label}</span>
      {stat ? <Coverage stat={stat} /> : null}
    </div>
  );
}

function AverageCell({
  stat,
  label,
}: {
  stat: PlayerStatAverage | null | undefined;
  label: string;
}) {
  return (
    <div className="statItem">
      <span className="statValue">{formatStatAverage(stat)}</span>
      <span className="statLabel">{label}</span>
      {stat ? <Coverage stat={stat} /> : null}
    </div>
  );
}

function TotalsRow({ totals }: { totals: PlayerStatsTotals }) {
  return (
    <>
      <td>{formatStatCount(totals.matchesPlayed)}</td>
      <td>{totals.matchesRecorded}</td>
      <td>{formatStatCount(totals.minutes)}</td>
      <td>{formatStatCount(totals.goals)}</td>
      <td>{formatStatCount(totals.assists)}</td>
      <td>{formatStatCount(totals.yellowCards)}</td>
      <td>{formatStatCount(totals.redCards)}</td>
    </>
  );
}

function ActivityTypeRow({ item }: { item: PlayerActivityTypeStats }) {
  return (
    <tr>
      <td>
        <span className="cellStrong">
          {activityTypeLabel(item.activityType)}
        </span>
        <span className="cellMuted">
          {item.matchLike ? "Cuenta como partido" : "No cuenta como partido"} ·{" "}
          {item.entries} {item.entries === 1 ? "registro" : "registros"}
        </span>
      </td>
      <TotalsRow totals={item.totals} />
    </tr>
  );
}

export function PlayerStatsPanel({ playerId }: { playerId: number }) {
  const { markSessionExpired } = useAuth();
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [loadedRequestKey, setLoadedRequestKey] = useState<string | null>(null);

  const requestKey = `${playerId}:${reloadKey}`;
  const isLoading = loadedRequestKey !== requestKey;

  useEffect(() => {
    const controller = new AbortController();
    let isActive = true;

    getPlayerStats(playerId, controller.signal)
      .then((data) => {
        if (!isActive) {
          return;
        }

        setStats(data);
        setLoadError(null);
        setLoadedRequestKey(requestKey);
      })
      .catch((error: unknown) => {
        if (!isActive || isAbortError(error)) {
          return;
        }

        if (error instanceof ApiError && error.status === 401) {
          markSessionExpired();
          return;
        }

        setStats(null);
        setLoadError(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar las estadísticas.",
        );
        setLoadedRequestKey(requestKey);
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [playerId, reloadKey, requestKey, markSessionExpired]);

  if (isLoading) {
    return <InlineLoading message="Cargando estadísticas…" />;
  }

  if (loadError || !stats) {
    return (
      <Alert variant="error" title="No se pudieron cargar las estadísticas">
        <p>{loadError ?? "Las estadísticas no están disponibles."}</p>
        <button
          className="linkButton"
          type="button"
          onClick={() => setReloadKey((current) => current + 1)}
        >
          Reintentar
        </button>
      </Alert>
    );
  }

  const { career } = stats;

  return (
    <div>
      {career.matchesRecorded === 0 ? (
        <Alert variant="info" title="Sin partidos registrados">
          <p>
            No hay partidos en el historial. Las actividades de entrenamiento o
            prueba deportiva sí aparecen en «Por tipo de actividad», pero no
            cuentan para la carrera ni para los promedios por partido.
          </p>
        </Alert>
      ) : null}

      <section className="card" aria-labelledby="player-career-stats">
        <h2 className="cardTitle" id="player-career-stats">
          Carrera
        </h2>
        <p className="formSectionNote">
          Solo partidos oficiales, amistosos y de torneo cuentan como partidos.
          Un valor desconocido se muestra como «—», nunca como cero.
        </p>

        <div className="statGrid sectionSpacer">
          <CountCell stat={career.matchesPlayed} label="Partidos jugados" />
          <CountCell stat={career.minutes} label="Minutos" />
          <CountCell stat={career.goals} label="Goles" />
          <CountCell stat={career.assists} label="Asistencias" />
          <CountCell stat={career.yellowCards} label="Amarillas" />
          <CountCell stat={career.redCards} label="Rojas" />
          <AverageCell
            stat={career.averageOverallRating}
            label="Rating general"
          />
          <AverageCell stat={career.goalsPerMatch} label="Goles/partido" />
          <AverageCell stat={career.assistsPerMatch} label="Asistencias/partido" />
        </div>

        {career.results ? (
          <div className="sectionSpacer">
            <h3 className="cardTitle">Resultados</h3>
            <div className="statGrid">
              <CountCell stat={career.results.wins} label="Victorias" />
              <CountCell stat={career.results.draws} label="Empates" />
              <CountCell stat={career.results.losses} label="Derrotas" />
              <div className="statItem">
                <span className="statValue">{career.results.unknownResults}</span>
                <span className="statLabel">Sin resultado</span>
              </div>
              <AverageCell stat={career.results.winRate} label="Tasa de victoria" />
            </div>
          </div>
        ) : null}
      </section>

      <section className="card sectionSpacer" aria-labelledby="player-ratings">
        <h2 className="cardTitle" id="player-ratings">
          Ratings
        </h2>
        <div className="statGrid">
          <AverageCell stat={stats.ratings.technical} label="Técnico" />
          <AverageCell stat={stats.ratings.tactical} label="Táctico" />
          <AverageCell stat={stats.ratings.physical} label="Físico" />
          <AverageCell stat={stats.ratings.mental} label="Mental" />
          <AverageCell stat={stats.ratings.overall} label="General" />
        </div>
      </section>

      <section className="card sectionSpacer" aria-labelledby="player-by-year">
        <h2 className="cardTitle" id="player-by-year">
          Por año
        </h2>
        {stats.byYear.length === 0 ? (
          <p>Sin partidos registrados por año.</p>
        ) : (
          <div className="tableWrap">
            <table className="dataTable">
              <thead>
                <tr>
                  <th scope="col">Año</th>
                  <th scope="col">Partidos</th>
                  <th scope="col">Registros</th>
                  <th scope="col">Minutos</th>
                  <th scope="col">Goles</th>
                  <th scope="col">Asist.</th>
                  <th scope="col">Amarillas</th>
                  <th scope="col">Rojas</th>
                </tr>
              </thead>
              <tbody>
                {stats.byYear.map((year) => (
                  <tr key={year.year}>
                    <td>{year.year}</td>
                    <TotalsRow totals={year.totals} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card sectionSpacer" aria-labelledby="player-by-type">
        <h2 className="cardTitle" id="player-by-type">
          Por tipo de actividad
        </h2>
        <div className="tableWrap">
          <table className="dataTable">
            <thead>
              <tr>
                <th scope="col">Tipo</th>
                <th scope="col">Partidos</th>
                <th scope="col">Registros</th>
                <th scope="col">Minutos</th>
                <th scope="col">Goles</th>
                <th scope="col">Asist.</th>
                <th scope="col">Amarillas</th>
                <th scope="col">Rojas</th>
              </tr>
            </thead>
            <tbody>
              {stats.byActivityType.map((item) => (
                <ActivityTypeRow key={item.activityType} item={item} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card sectionSpacer" aria-labelledby="player-by-position">
        <h2 className="cardTitle" id="player-by-position">
          Por posición
        </h2>
        {stats.byPosition.length === 0 ? (
          <p>Sin posiciones registradas.</p>
        ) : (
          <div className="tableWrap">
            <table className="dataTable">
              <thead>
                <tr>
                  <th scope="col">Posición</th>
                  <th scope="col">Grupo</th>
                  <th scope="col">Partidos</th>
                  <th scope="col">Registros</th>
                  <th scope="col">Minutos</th>
                  <th scope="col">Goles</th>
                  <th scope="col">Asist.</th>
                  <th scope="col">Amarillas</th>
                  <th scope="col">Rojas</th>
                </tr>
              </thead>
              <tbody>
                {stats.byPosition.map((item, index) => (
                  <tr key={`${item.position ?? "unknown"}-${index}`}>
                    <td>{positionLabel(item.position)}</td>
                    <td>{positionGroupLabel(item.positionGroup)}</td>
                    <TotalsRow totals={item.totals} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section
        className="card sectionSpacer"
        aria-labelledby="player-by-group"
      >
        <h2 className="cardTitle" id="player-by-group">
          Por grupo de posición
        </h2>
        {stats.byPositionGroup.length === 0 ? (
          <p>Sin grupos de posición registrados.</p>
        ) : (
          <div className="tableWrap">
            <table className="dataTable">
              <thead>
                <tr>
                  <th scope="col">Grupo</th>
                  <th scope="col">Partidos</th>
                  <th scope="col">Registros</th>
                  <th scope="col">Minutos</th>
                  <th scope="col">Goles</th>
                  <th scope="col">Asist.</th>
                  <th scope="col">Amarillas</th>
                  <th scope="col">Rojas</th>
                </tr>
              </thead>
              <tbody>
                {stats.byPositionGroup.map((item, index) => (
                  <tr key={`${item.positionGroup ?? "unknown"}-${index}`}>
                    <td>{positionGroupLabel(item.positionGroup)}</td>
                    <TotalsRow totals={item.totals} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
