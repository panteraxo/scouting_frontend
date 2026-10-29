"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Alert } from "@/components/ui/alert";
import type { RecommendationDetail } from "@/types/api";
import { formatProspectDateTime } from "@/features/prospecciones/catalogs";
import {
  recommendationPlayerName,
  recommendationScoutName,
  recommendationStatusBadgeClass,
  recommendationStatusLabel,
  responseStatusBadgeClass,
  responseStatusLabel,
} from "../catalogs";
import { RecommendationSnapshotView } from "./recommendation-snapshot-view";

export function RecommendationDetailView({
  recommendation,
  backHref,
  backLabel,
  children,
}: {
  recommendation: RecommendationDetail;
  backHref: string;
  backLabel: string;
  children?: ReactNode;
}) {
  return (
    <div>
      <header className="pageHeader">
        <div>
          <p className="eyebrow">RECOMENDACIÓN</p>
          <h1>Recomendación a {recommendation.club.name}</h1>
          <p>
            {recommendationPlayerName(recommendation.player)} · Enviada el{" "}
            {formatProspectDateTime(recommendation.sentAt)}. El contenido no se
            edita ni elimina.
          </p>
        </div>
        <Link className="button buttonSecondary" href={backHref}>
          {backLabel}
        </Link>
      </header>

      <section className="card" aria-labelledby="recommendation-summary">
        <div className="tableHeader">
          <div>
            <h2 className="cardTitle" id="recommendation-summary">
              Datos del envío
            </h2>
            <p className="tableCount">
              Ojeador: {recommendationScoutName(recommendation.scout)} · Club:{" "}
              {recommendation.club.code}
            </p>
          </div>
          <span className={recommendationStatusBadgeClass(recommendation.status)}>
            {recommendationStatusLabel(recommendation.status)}
          </span>
        </div>

        <dl className="metaList">
          <div>
            <dt>Jugador</dt>
            <dd>{recommendationPlayerName(recommendation.player)}</dd>
          </div>
          <div>
            <dt>Ojeador</dt>
            <dd>{recommendationScoutName(recommendation.scout)}</dd>
          </div>
          <div>
            <dt>Club</dt>
            <dd>
              {recommendation.club.name} ({recommendation.club.code})
            </dd>
          </div>
          <div>
            <dt>Enviada</dt>
            <dd>{formatProspectDateTime(recommendation.sentAt)}</dd>
          </div>
          <div>
            <dt>Última actualización</dt>
            <dd>{formatProspectDateTime(recommendation.updatedAt)}</dd>
          </div>
        </dl>

        <div className="sectionSpacer">
          <h3 className="cardTitle">Carta de recomendación</h3>
          <p className="preLine">{recommendation.message}</p>
        </div>
      </section>

      <RecommendationSnapshotView snapshot={recommendation.snapshot} />

      <section className="card sectionSpacer" aria-labelledby="recommendation-responses">
        <h2 className="cardTitle" id="recommendation-responses">
          Respuestas del club
        </h2>
        <p className="formSectionNote">
          Las respuestas no se editan ni eliminan.
        </p>

        {recommendation.responses.length === 0 ? (
          <Alert variant="info" title="Sin respuestas">
            <p>El club todavía no registró una respuesta a esta recomendación.</p>
          </Alert>
        ) : (
          <div className="prospectEvaluationList">
            {recommendation.responses.map((response, index) => (
              <article className="prospectEvaluation" key={response.id}>
                <div className="prospectEvaluationHeader">
                  <div>
                    <p className="detailCode">
                      {formatProspectDateTime(response.respondedAt)}
                    </p>
                    <div className="badgeRow">
                      <span className={responseStatusBadgeClass(response.status)}>
                        {responseStatusLabel(response.status)}
                      </span>
                      {index === 0 ? (
                        <span className="statusBadge statusActive">
                          Respuesta vigente
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <p className="preLine sectionSpacer">{response.message}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      {children}
    </div>
  );
}
