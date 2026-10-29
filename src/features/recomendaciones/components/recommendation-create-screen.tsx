"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { Alert } from "@/components/ui/alert";
import { SelectField, TextAreaField } from "@/components/ui/form-field";
import { InlineLoading, Spinner, StatePanel } from "@/components/ui/loading";
import { useAuth } from "@/features/auth/auth-provider";
import { ApiError, isAbortError } from "@/lib/api-client";
import { listDirectoryOrganizations } from "@/features/organizations/organizations-api";
import {
  activityTypeLabel,
  ageCategoryLabel,
  competitiveLevelLabel,
  positionLabel,
} from "@/features/jugadores/catalogs";
import { listPlayerHistory } from "@/features/jugadores/players-api";
import {
  getProspect,
  listProspectEvaluations,
} from "@/features/prospecciones/prospects-api";
import {
  formatProspectDate,
} from "@/features/prospecciones/catalogs";
import type {
  ProspectResponse,
  RecommendationDetail,
} from "@/types/api";
import { canManageRecommendations } from "../access";
import { recommendationPlayerName } from "../catalogs";
import { createProspectRecommendation } from "../recommendations-api";
import { scoutRecommendationDetailPath } from "../routes";
import { RecommendationAccessRestricted } from "./recommendation-access-restricted";

interface ClubOption {
  id: number;
  name: string;
  code: string;
}

interface HistoryOption {
  id: number;
  label: string;
  detail: string;
}

interface EvaluationOption {
  id: number;
  label: string;
  detail: string;
}

export function RecommendationCreateScreen() {
  const { user, markSessionExpired } = useAuth();
  const allowed = canManageRecommendations(user?.role);
  const params = useParams();
  const rawProspectId = params.id;
  const prospectIdValue = Array.isArray(rawProspectId)
    ? rawProspectId[0]
    : rawProspectId;
  const prospectId = Number(prospectIdValue);
  const hasValidProspectId =
    Number.isInteger(prospectId) && prospectId > 0;

  const [prospect, setProspect] = useState<ProspectResponse | null>(null);
  const [clubs, setClubs] = useState<ClubOption[]>([]);
  const [clubReloadKey, setClubReloadKey] = useState(0);
  const [clubsError, setClubsError] = useState<string | null>(null);
  const [loadedClubKey, setLoadedClubKey] = useState<string | null>(null);
  const [historyOptions, setHistoryOptions] = useState<HistoryOption[]>([]);
  const [evaluationOptions, setEvaluationOptions] = useState<EvaluationOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectionNotice, setSelectionNotice] = useState<string | null>(null);

  const [clubId, setClubId] = useState("");
  const [message, setMessage] = useState("");
  const [selectedHistory, setSelectedHistory] = useState<Set<number>>(
    new Set(),
  );
  const [selectedEvaluations, setSelectedEvaluations] = useState<Set<number>>(
    new Set(),
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [created, setCreated] = useState<RecommendationDetail | null>(null);

  const clubKey = String(clubReloadKey);
  const clubsLoading = loadedClubKey !== clubKey;

  useEffect(() => {
    if (!allowed) {
      return;
    }

    const controller = new AbortController();
    let isActive = true;

    listDirectoryOrganizations(
      "club",
      {
        page: 0,
        size: 100,
        sort: "name,asc",
      },
      controller.signal,
    )
      .then((data) => {
        if (!isActive) {
          return;
        }

        setClubs(
          data.content.map((club) => ({
            id: club.id,
            name: club.name,
            code: club.code,
          })),
        );
        setClubsError(null);
        setLoadedClubKey(clubKey);
      })
      .catch((error: unknown) => {
        if (!isActive || isAbortError(error)) {
          return;
        }

        if (error instanceof ApiError && error.status === 401) {
          markSessionExpired();
          return;
        }

        setClubs([]);
        setClubsError(
          error instanceof Error
            ? error.message
            : "No se pudo cargar el listado de clubes.",
        );
        setLoadedClubKey(clubKey);
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [allowed, clubReloadKey, clubKey, markSessionExpired]);

  useEffect(() => {
    if (!allowed || !hasValidProspectId) {
      return;
    }

    const controller = new AbortController();
    let isActive = true;

    const load = async () => {
      try {
        const prospectData = await getProspect(prospectId, controller.signal);
        if (!isActive) {
          return;
        }
        setProspect(prospectData);

        const [historyResult, evaluationResult] =
          await Promise.allSettled([
            listPlayerHistory(
              prospectData.player.id,
              { page: 0, size: 100, sort: "activityDate,desc" },
              controller.signal,
            ),
            listProspectEvaluations(
              prospectId,
              { page: 0, size: 100 },
              controller.signal,
            ),
          ]);

        if (!isActive) {
          return;
        }

        if (historyResult.status === "fulfilled") {
          setHistoryOptions(
            historyResult.value.content.map((entry) => ({
              id: entry.id,
              label: `${formatProspectDate(entry.activityDate)} · ${activityTypeLabel(
                entry.activityType,
              )}`,
              detail: [
                entry.opponent || "Sin rival",
                entry.competition || "Sin competición",
                positionLabel(entry.positionPlayed),
                ageCategoryLabel(entry.ageCategory),
                competitiveLevelLabel(entry.competitiveLevel),
              ].join(" · "),
            })),
          );
        } else {
          setSelectionNotice(
            "No se pudieron cargar los historiales; puedes enviar la recomendación sin seleccionarlos.",
          );
        }

        if (evaluationResult.status === "fulfilled") {
          setEvaluationOptions(
            evaluationResult.value.content.map((evaluation) => ({
              id: evaluation.id,
              label: `Evaluación del ${formatProspectDate(evaluation.evaluatedAt)}`,
              detail: `Técnico ${evaluation.technicalRating} · Táctico ${evaluation.tacticalRating} · Físico ${evaluation.physicalRating} · Mental ${evaluation.mentalRating}${
                evaluation.overallRating !== null
                  ? ` · General ${evaluation.overallRating}`
                  : ""
              }`,
            })),
          );
        } else {
          setSelectionNotice(
            "No se pudieron cargar las evaluaciones; puedes enviar la recomendación sin seleccionarlas.",
          );
        }

        setLoadError(null);
      } catch (error) {
        if (!isActive || isAbortError(error)) {
          return;
        }

        if (error instanceof ApiError && error.status === 401) {
          markSessionExpired();
          return;
        }

        setProspect(null);
        setLoadError(
          error instanceof ApiError && error.status === 404
            ? "La prospección no existe o pertenece a otro ojeador."
            : error instanceof Error
              ? error.message
              : "No se pudo cargar la prospección.",
        );
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [allowed, hasValidProspectId, prospectId, markSessionExpired]);

  if (!allowed) {
    return (
      <RecommendationAccessRestricted
        title="Nueva recomendación"
        message="Solo el ojeador autor de la prospección puede recomendar al jugador."
      />
    );
  }

  if (!hasValidProspectId) {
    return (
      <div>
        <header className="pageHeader">
          <div>
            <p className="eyebrow">RECOMENDACIONES</p>
            <h1>Prospección no válida</h1>
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

  function toggleSet(
    setter: Dispatch<SetStateAction<Set<number>>>,
    id: number,
  ) {
    setter((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    const errors: Record<string, string> = {};
    if (!clubId) {
      errors.clubId = "Selecciona un club activo y verificado.";
    }
    if (!message.trim()) {
      errors.message = "Ingresa la carta de recomendación.";
    } else if (message.trim().length > 4000) {
      errors.message = "La carta no debe superar 4000 caracteres.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormError("Revisa los campos marcados e intenta nuevamente.");
      document.getElementById(Object.keys(errors)[0])?.focus();
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setIsSubmitting(true);

    try {
      const result = await createProspectRecommendation(prospectId, {
        clubId: Number(clubId),
        message: message.trim(),
        historyEntryIds: Array.from(selectedHistory),
        evaluationIds: Array.from(selectedEvaluations),
      });

      if (result) {
        setCreated(result);
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        markSessionExpired();
        return;
      }

      if (error instanceof ApiError && error.fieldErrors) {
        setFieldErrors(error.fieldErrors);
        setFormError("Revisa los campos marcados e intenta nuevamente.");
      } else if (
        error instanceof ApiError &&
        error.code === "GUARDIAN_CONSENT_REQUIRED"
      ) {
        setFormError(
          "Se requiere consentimiento vigente del tutor con estado otorgado para recomendar a un menor.",
        );
      } else {
        setFormError(
          error instanceof Error
            ? error.message
            : "No se pudo enviar la recomendación.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (created) {
    return (
      <div>
        <header className="pageHeader">
          <div>
            <p className="eyebrow">RECOMENDACIONES</p>
            <h1>Recomendación enviada</h1>
            <p>
              La carta y la selección compartida se guardaron tal como se
              enviaron al club.
            </p>
          </div>
        </header>
        <Alert variant="success" title="Recomendación enviada">
          <p>
            La recomendación de {recommendationPlayerName(created.player)} a{" "}
            <strong>{created.club.name}</strong> fue registrada.
          </p>
        </Alert>
        <div className="formActions">
          <Link
            className="button buttonPrimary"
            href={scoutRecommendationDetailPath(created.id)}
          >
            Ver recomendación
          </Link>
          <Link className="button buttonSecondary" href="/prospecciones">
            Volver a prospecciones
          </Link>
        </div>
      </div>
    );
  }

  const minor =
    prospect?.player.age !== null &&
    prospect?.player.age !== undefined &&
    prospect.player.age < 18;

  return (
    <div>
      <header className="pageHeader">
        <div>
          <p className="eyebrow">RECOMENDACIONES</p>
          <h1>Recomendar a club</h1>
          <p>
            {prospect
              ? `${recommendationPlayerName(prospect.player)} · Selecciona un club activo y verificado, escribe la carta y elige qué historiales y evaluaciones compartir.`
              : "Completa la recomendación para el jugador de tu prospección."}
          </p>
        </div>
        {prospect ? (
          <Link
            className="button buttonSecondary"
            href={`/prospecciones/${prospect.id}`}
          >
            Volver a la prospección
          </Link>
        ) : null}
      </header>

      {isLoading ? (
        <InlineLoading message="Cargando datos de la recomendación…" />
      ) : loadError || !prospect ? (
        <Alert variant="error" title="No se pudo cargar la prospección">
          <p>{loadError ?? "La prospección no está disponible."}</p>
          <Link className="button buttonSecondary buttonSmall cardAction" href="/prospecciones">
            Volver a prospecciones
          </Link>
        </Alert>
      ) : (
        <>
          {minor ? (
            <Alert variant="warning" title="Jugador menor de edad">
              <p>
                Para recomendar a un menor se exige consentimiento vigente del
                tutor con estado otorgado. Si falta o está revocado, no se
                permitirá el envío.
              </p>
            </Alert>
          ) : null}

          {selectionNotice ? (
            <Alert variant="info" title="Selección parcial">
              <p>{selectionNotice}</p>
            </Alert>
          ) : null}

          {clubsLoading ? (
            <InlineLoading message="Cargando clubes activos y verificados…" />
          ) : clubsError ? (
            <Alert variant="error" title="No se pudo cargar el listado de clubes">
              <p>{clubsError}</p>
              <div className="formActions">
                <button
                  className="button buttonPrimary buttonSmall"
                  type="button"
                  onClick={() =>
                    setClubReloadKey((current) => current + 1)
                  }
                >
                  Reintentar
                </button>
                <Link
                  className="button buttonSecondary buttonSmall"
                  href="/clubes"
                >
                  Ver clubes
                </Link>
              </div>
            </Alert>
          ) : clubs.length === 0 ? (
            <StatePanel
              title="Sin clubes activos y verificados"
              action={
                <Link className="button buttonSecondary" href="/clubes">
                  Ver clubes
                </Link>
              }
            >
              <p>
                No hay clubes activos y verificados disponibles. No se puede
                enviar una recomendación en este momento.
              </p>
            </StatePanel>
          ) : (
                <section className="card">
                  <form className="form" onSubmit={handleSubmit} noValidate>
                {formError ? (
                  <Alert variant="error" title="No se pudo enviar">
                    <p>{formError}</p>
                  </Alert>
                ) : null}

                <SelectField
                  label="Club destinatario"
                  name="clubId"
                  value={clubId}
                  onChange={(event) => setClubId(event.target.value)}
                  error={fieldErrors.clubId}
                  hint="Solo se muestran clubes activos y verificados."
                  disabled={isSubmitting}
                  required
                >
                  <option value="">Selecciona un club</option>
                  {clubs.map((club) => (
                    <option key={club.id} value={club.id}>
                      {club.name} ({club.code})
                    </option>
                  ))}
                </SelectField>

                <TextAreaField
                  label="Carta de recomendación"
                  name="message"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  error={fieldErrors.message}
                  maxLength={4000}
                  rows={6}
                  hint="Obligatoria. Máximo 4000 caracteres."
                  disabled={isSubmitting}
                  required
                />

                <fieldset className="formSection">
                  <legend className="formSectionTitle">
                    Historiales a compartir (opcional)
                  </legend>
                  <p className="formSectionNote">
                    Se muestran hasta 100 historiales. No se incluyen notas
                    privadas de la prospección.
                  </p>
                  {historyOptions.length === 0 ? (
                    <p className="fieldHint">
                      No hay historiales disponibles en este momento.
                    </p>
                  ) : (
                    <ul className="checkList">
                      {historyOptions.map((option) => (
                        <li key={option.id} className="checkItem">
                          <label>
                            <input
                              type="checkbox"
                              checked={selectedHistory.has(option.id)}
                              onChange={() =>
                                toggleSet(setSelectedHistory, option.id)
                              }
                              disabled={isSubmitting}
                            />{" "}
                            <span>
                              <strong>{option.label}</strong>
                              <span className="cellMuted">{option.detail}</span>
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                </fieldset>

                <fieldset className="formSection">
                  <legend className="formSectionTitle">
                    Evaluaciones a compartir (opcional)
                  </legend>
                  <p className="formSectionNote">
                    Solo se comparten fecha, ratings, fortalezas, mejoras,
                    recomendación y video. Las notas privadas no se incluyen.
                  </p>
                  {evaluationOptions.length === 0 ? (
                    <p className="fieldHint">
                      No hay evaluaciones disponibles en este momento.
                    </p>
                  ) : (
                    <ul className="checkList">
                      {evaluationOptions.map((option) => (
                        <li key={option.id} className="checkItem">
                          <label>
                            <input
                              type="checkbox"
                              checked={selectedEvaluations.has(option.id)}
                              onChange={() =>
                                toggleSet(
                                  setSelectedEvaluations,
                                  option.id,
                                )
                              }
                              disabled={isSubmitting}
                            />{" "}
                            <span>
                              <strong>{option.label}</strong>
                              <span className="cellMuted">{option.detail}</span>
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                </fieldset>

                <div className="formActions">
                  <button
                    className="button buttonPrimary"
                    type="submit"
                    disabled={isSubmitting || clubs.length === 0}
                  >
                    {isSubmitting ? <Spinner /> : null}
                    {isSubmitting ? "Enviando…" : "Enviar recomendación"}
                  </button>
                  <Link
                    className="button buttonSecondary"
                    href={`/prospecciones/${prospect.id}`}
                  >
                    Cancelar
                  </Link>
                </div>
              </form>
            </section>
          )}
        </>
      )}
    </div>
  );
}

