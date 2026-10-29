"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/loading";
import { useAuth } from "@/features/auth/auth-provider";
import { ApiError, isAbortError } from "@/lib/api-client";
import type { ProspectResponse } from "@/types/api";
import { canUseProspects } from "../access";
import {
  prospectStatusBadgeClass,
  prospectStatusLabel,
} from "../catalogs";
import { createProspect, findProspectForPlayer } from "../prospects-api";
import { prospectDetailPath, PROSPECTS_PATH } from "../routes";

export function ScoutProspectAction({ playerId }: { playerId: number }) {
  const { user, markSessionExpired } = useAuth();
  const router = useRouter();
  const canUse = canUseProspects(user?.role);
  const [prospect, setProspect] = useState<ProspectResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [loadedRequestKey, setLoadedRequestKey] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const requestKey = `${playerId}:${reloadKey}`;
  const isLoading = loadedRequestKey !== requestKey;

  useEffect(() => {
    if (!canUse || playerId <= 0) {
      return;
    }

    const controller = new AbortController();
    let isActive = true;

    findProspectForPlayer(playerId, controller.signal)
      .then((result) => {
        if (isActive) {
          setProspect(result);
          setLoadError(null);
        }
      })
      .catch((error: unknown) => {
        if (!isActive || isAbortError(error)) {
          return;
        }

        if (error instanceof ApiError && error.status === 401) {
          markSessionExpired();
          return;
        }

        setLoadError(
          error instanceof Error
            ? error.message
            : "No se pudo comprobar la prospección.",
        );
      })
      .finally(() => {
        if (isActive) {
          setLoadedRequestKey(requestKey);
        }
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [canUse, playerId, requestKey, markSessionExpired]);

  if (!canUse) {
    return null;
  }

  if (playerId <= 0) {
    return (
      <Link className="button buttonSecondary" href={PROSPECTS_PATH}>
        Ver prospecciones
      </Link>
    );
  }

  if (isLoading) {
    return (
      <div className="prospectActionGroup">
        <span className="button buttonSecondary" aria-disabled="true">
          Comprobando prospección…
        </span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="prospectActionGroup">
        <button
          className="button buttonSecondary"
          type="button"
          onClick={() => setReloadKey((current) => current + 1)}
        >
          Reintentar
        </button>
        <span className="fieldError prospectActionError">{loadError}</span>
      </div>
    );
  }

  if (prospect) {
    return (
      <div className="prospectActionGroup">
        <span className={prospectStatusBadgeClass(prospect.status)}>
          {prospectStatusLabel(prospect.status)}
        </span>
        <Link
          className="button buttonPrimary"
          href={prospectDetailPath(prospect.id)}
        >
          Ver prospección
        </Link>
      </div>
    );
  }

  async function handleFollow() {
    if (isCreating) {
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      const created = await createProspect({
        playerId,
        privateNotes: null,
      });

      if (created) {
        setProspect(created);
      }

      router.push(PROSPECTS_PATH);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        markSessionExpired();
        return;
      }

      if (
        error instanceof ApiError &&
        (error.status === 409 || error.code === "PROSPECT_ALREADY_EXISTS")
      ) {
        try {
          const existing = await findProspectForPlayer(playerId);
          if (existing) {
            setProspect(existing);
            router.push(prospectDetailPath(existing.id));
            return;
          }
        } catch (refreshError) {
          if (
            refreshError instanceof ApiError &&
            refreshError.status === 401
          ) {
            markSessionExpired();
            return;
          }
        }

        router.push(`${PROSPECTS_PATH}?playerId=${playerId}`);
        return;
      }

      setCreateError(
        error instanceof Error
          ? error.message
          : "No se pudo iniciar la prospección.",
      );
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="prospectActionGroup">
      <button
        className="button buttonPrimary"
        type="button"
        onClick={handleFollow}
        disabled={isCreating}
      >
        {isCreating ? <Spinner /> : null}
        {isCreating ? "Siguiendo…" : "Seguir"}
      </button>
      {createError ? (
        <span className="fieldError prospectActionError">{createError}</span>
      ) : null}
    </div>
  );
}
