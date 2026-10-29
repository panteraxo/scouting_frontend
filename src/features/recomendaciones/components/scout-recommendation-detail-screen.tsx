"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { InlineLoading, StatePanel } from "@/components/ui/loading";
import { useAuth } from "@/features/auth/auth-provider";
import { ApiError, isAbortError } from "@/lib/api-client";
import type { RecommendationDetail } from "@/types/api";
import { canManageRecommendations } from "../access";
import { getScoutRecommendation } from "../recommendations-api";
import { RecommendationAccessRestricted } from "./recommendation-access-restricted";
import { RecommendationDetailView } from "./recommendation-detail-view";

export function ScoutRecommendationDetailScreen() {
  const { user, markSessionExpired } = useAuth();
  const allowed = canManageRecommendations(user?.role);
  const params = useParams();
  const rawId = params.id;
  const idValue = Array.isArray(rawId) ? rawId[0] : rawId;
  const id = Number(idValue);
  const hasValidId = Number.isInteger(id) && id > 0;

  const [recommendation, setRecommendation] =
    useState<RecommendationDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [loadedRequestKey, setLoadedRequestKey] = useState<string | null>(null);

  const requestKey = `${id}:${reloadKey}`;
  const isLoadingKey = loadedRequestKey !== requestKey;

  useEffect(() => {
    if (!allowed || !hasValidId) {
      return;
    }

    const controller = new AbortController();
    let isActive = true;

    getScoutRecommendation(id, controller.signal)
      .then((data) => {
        if (!isActive) {
          return;
        }

        setRecommendation(data);
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

        setRecommendation(null);
        setLoadError(
          error instanceof ApiError && error.status === 404
            ? "La recomendación no existe o pertenece a otro ojeador."
            : error instanceof Error
              ? error.message
              : "No se pudo cargar la recomendación.",
        );
        setLoadedRequestKey(requestKey);
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [allowed, hasValidId, id, reloadKey, requestKey, markSessionExpired]);

  if (!allowed) {
    return (
      <RecommendationAccessRestricted
        title="Recomendación"
        message="Solo el ojeador autor puede consultar esta recomendación."
      />
    );
  }

  if (!hasValidId) {
    return (
      <div>
        <header className="pageHeader">
          <div>
            <p className="eyebrow">RECOMENDACIONES</p>
            <h1>Recomendación no válida</h1>
            <p>La dirección de esta página no es válida.</p>
          </div>
        </header>
        <StatePanel
          title="No se pudo abrir la recomendación"
          action={
            <Link className="button buttonSecondary" href="/prospecciones">
              Volver a prospecciones
            </Link>
          }
        >
          <p>Verifica el enlace o regresa al listado de prospecciones.</p>
        </StatePanel>
      </div>
    );
  }

  return (
    <div>
      {isLoadingKey ? (
        <InlineLoading message="Cargando recomendación…" />
      ) : loadError || !recommendation ? (
        <>
          <header className="pageHeader">
            <div>
              <p className="eyebrow">RECOMENDACIONES</p>
              <h1>Recomendación</h1>
              <p>Contenido privado del ojeador autor.</p>
            </div>
          </header>
          <Alert variant="error" title="No se pudo cargar la recomendación">
            <p>{loadError ?? "La recomendación no está disponible."}</p>
            <div className="formActions">
              <button
                className="button buttonSecondary buttonSmall"
                type="button"
                onClick={() => {
                  setReloadKey((current) => current + 1);
                }}
              >
                Reintentar
              </button>
              <Link className="button buttonGhost buttonSmall" href="/prospecciones">
                Volver a prospecciones
              </Link>
            </div>
          </Alert>
        </>
      ) : (
        <RecommendationDetailView
          recommendation={recommendation}
          backHref={`/prospecciones/${recommendation.prospectId}`}
          backLabel="Volver a la prospección"
        />
      )}
    </div>
  );
}
