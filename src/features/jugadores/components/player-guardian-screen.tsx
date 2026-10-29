"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { SelectField, TextField } from "@/components/ui/form-field";
import { InlineLoading, StatePanel } from "@/components/ui/loading";
import { useAuth } from "@/features/auth/auth-provider";
import { ApiError, isAbortError } from "@/lib/api-client";
import { documentTypeLabel } from "@/features/auth/user-labels";
import type {
  DocumentType,
  GuardianConsentStatus,
  GuardianConsentUpdateInput,
  PlayerDetailResponse,
  PlayerGuardianScoutResponse,
  PlayerGuardianStaffResponse,
  PlayerGuardianUpsertInput,
} from "@/types/api";
import {
  canAccessGuardian,
  canWriteGuardian,
} from "../access";
import {
  CONSENT_STATUS_LABELS,
  formatDateTime,
} from "../catalogs";
import {
  getPlayer,
  getPlayerGuardian,
  updateGuardianConsent,
  upsertPlayerGuardian,
} from "../players-api";
import { playerDetailPath, PLAYERS_PATH } from "../routes";
import { PlayerAccessRestricted } from "./player-access-restricted";

type FieldErrors = Record<string, string>;

interface GuardianFormState {
  firstName: string;
  lastName: string;
  documentType: string;
  documentNumber: string;
  phone: string;
  address: string;
  relationship: string;
}

const EMPTY_FORM: GuardianFormState = {
  firstName: "",
  lastName: "",
  documentType: "DNI",
  documentNumber: "",
  phone: "",
  address: "",
  relationship: "",
};

const DOCUMENT_PATTERN = /^[A-Za-z0-9-]{4,30}$/;
const PHONE_PATTERN = /^[0-9+()\-\s]{6,20}$/;

function formFromGuardian(
  guardian: PlayerGuardianStaffResponse | null,
): GuardianFormState {
  if (!guardian) {
    return EMPTY_FORM;
  }

  return {
    firstName: guardian.firstName,
    lastName: guardian.lastName,
    documentType: guardian.documentType,
    documentNumber: guardian.documentNumber,
    phone: guardian.phone,
    address: guardian.address,
    relationship: guardian.relationship,
  };
}

function allowedConsentStatuses(
  current: GuardianConsentStatus | null,
): Array<"GRANTED" | "DENIED" | "REVOKED"> {
  if (!current || current === "NOT_RECORDED") {
    return ["GRANTED", "DENIED"];
  }
  if (current === "DENIED" || current === "REVOKED") {
    return ["GRANTED"];
  }
  return ["REVOKED"];
}

function isStaffGuardian(
  guardian: PlayerGuardianStaffResponse | PlayerGuardianScoutResponse | null,
): guardian is PlayerGuardianStaffResponse {
  return Boolean(guardian && "version" in guardian);
}

export function PlayerGuardianScreen() {
  const { user, markSessionExpired } = useAuth();
  const role = user?.role;
  const canView = canAccessGuardian(role);
  const canWrite = canWriteGuardian(role);
  const params = useParams();
  const rawId = params.id;
  const idValue = Array.isArray(rawId) ? rawId[0] : rawId;
  const id = Number(idValue);
  const hasValidId = Number.isInteger(id) && id > 0;

  const [player, setPlayer] = useState<PlayerDetailResponse | null>(null);
  const [guardian, setGuardian] = useState<
    PlayerGuardianStaffResponse | PlayerGuardianScoutResponse | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [guardianMissing, setGuardianMissing] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [loadedRequestKey, setLoadedRequestKey] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [form, setForm] = useState<GuardianFormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [consentStatus, setConsentStatus] = useState<
    "" | "GRANTED" | "DENIED" | "REVOKED"
  >("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [consentNote, setConsentNote] = useState("");
  const [consentError, setConsentError] = useState<string | null>(null);
  const [isSavingConsent, setIsSavingConsent] = useState(false);

  const requestKey = `${id}:${reloadKey}`;
  const isRequestLoading = loadedRequestKey !== requestKey;

  useEffect(() => {
    if (!canView || !hasValidId) {
      return;
    }

    const controller = new AbortController();
    let isActive = true;

    getPlayer(id, controller.signal)
      .then(async (data) => {
        if (!isActive) {
          return;
        }

        setPlayer(data);

        const staffDetail = "guardianRequired" in data ? data : null;
        const scoutDetail = "guardianDataAvailable" in data ? data : null;
        const adult =
          staffDetail !== null
            ? !staffDetail.guardianRequired
            : scoutDetail !== null
              ? (data.age ?? 0) >= 18
              : false;

        if (adult) {
          setGuardian(null);
          setGuardianMissing(false);
          setLoadError(null);
          setLoadedRequestKey(requestKey);
          setIsLoading(false);
          return;
        }

        try {
          const guardianData = await getPlayerGuardian(id, controller.signal);
          if (!isActive) {
            return;
          }
          setGuardian(guardianData);
          setGuardianMissing(false);
          setForm(formFromGuardian(isStaffGuardian(guardianData) ? guardianData : null));
          setConsentStatus("");
          setEvidenceUrl(
            isStaffGuardian(guardianData)
              ? guardianData.consent.evidenceUrl ?? ""
              : "",
          );
          setConsentNote(
            isStaffGuardian(guardianData)
              ? guardianData.consent.note ?? ""
              : "",
          );
          setLoadError(null);
        } catch (error) {
          if (isAbortError(error)) {
            return;
          }

          if (error instanceof ApiError) {
            if (error.status === 401) {
              markSessionExpired();
              return;
            }

            if (
              error.code === "GUARDIAN_NOT_FOUND" ||
              error.status === 404
            ) {
              setGuardian(null);
              setGuardianMissing(true);
              setForm(EMPTY_FORM);
              setLoadError(null);
            } else if (error.code === "GUARDIAN_NOT_APPLICABLE") {
              setGuardian(null);
              setGuardianMissing(false);
              setLoadError(null);
            } else {
              setLoadError(error.message);
            }
          } else {
            setLoadError(
              "No se pudo cargar la información del tutor.",
            );
          }
        } finally {
          if (isActive) {
            setLoadedRequestKey(requestKey);
            setIsLoading(false);
          }
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

        setPlayer(null);
        setLoadError(
          error instanceof Error
            ? error.message
            : "No se pudo cargar la ficha del jugador.",
        );
        setLoadedRequestKey(requestKey);
        setIsLoading(false);
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [
    canView,
    hasValidId,
    id,
    reloadKey,
    requestKey,
    markSessionExpired,
  ]);

  if (!canView) {
    return (
      <PlayerAccessRestricted
        title="Tutor del jugador"
        message="Solo el Profesor o Director de la academia y los ojeadores pueden acceder a esta ficha. El Administrador y el Jugador no tienen acceso."
      />
    );
  }

  if (!hasValidId) {
    return (
      <div>
        <header className="pageHeader">
          <div>
            <p className="eyebrow">JUGADORES</p>
            <h1>Jugador no válido</h1>
            <p>La dirección de esta página no es válida.</p>
          </div>
        </header>
        <StatePanel
          title="No se pudo abrir el tutor"
          action={
            <Link className="button buttonSecondary" href={PLAYERS_PATH}>
              Volver al listado
            </Link>
          }
        >
          <p>Verifica el enlace o regresa al listado de jugadores.</p>
        </StatePanel>
      </div>
    );
  }

  function updateForm<K extends keyof GuardianFormState>(
    key: K,
    value: GuardianFormState[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function validateGuardian(): FieldErrors {
    const errors: FieldErrors = {};
    if (!form.firstName.trim()) {
      errors.firstName = "Ingresa los nombres del tutor.";
    } else if (form.firstName.trim().length > 100) {
      errors.firstName = "Los nombres no deben superar 100 caracteres.";
    }
    if (!form.lastName.trim()) {
      errors.lastName = "Ingresa los apellidos del tutor.";
    } else if (form.lastName.trim().length > 100) {
      errors.lastName = "Los apellidos no deben superar 100 caracteres.";
    }
    if (!["DNI", "CE", "PASSPORT"].includes(form.documentType)) {
      errors.documentType = "Selecciona un tipo de documento.";
    }
    if (!form.documentNumber.trim()) {
      errors.documentNumber = "Ingresa el número de documento.";
    } else if (!DOCUMENT_PATTERN.test(form.documentNumber.trim())) {
      errors.documentNumber =
        "Usa entre 4 y 30 caracteres: letras, números o guiones.";
    }
    if (!form.phone.trim()) {
      errors.phone = "Ingresa el teléfono del tutor.";
    } else if (!PHONE_PATTERN.test(form.phone.trim())) {
      errors.phone =
        "Usa entre 6 y 20 caracteres: números, espacios, +, ( ) o guiones.";
    }
    if (!form.address.trim()) {
      errors.address = "Ingresa la dirección del tutor.";
    } else if (form.address.trim().length > 300) {
      errors.address = "La dirección no debe superar 300 caracteres.";
    }
    if (!form.relationship.trim()) {
      errors.relationship = "Ingresa el parentesco.";
    } else if (form.relationship.trim().length > 80) {
      errors.relationship = "El parentesco no debe superar 80 caracteres.";
    }
    return errors;
  }

  async function handleGuardianSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) {
      return;
    }

    const errors = validateGuardian();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormError("Revisa los campos marcados e intenta nuevamente.");
      document.getElementById(Object.keys(errors)[0])?.focus();
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setActionError(null);
    setSuccessMessage(null);
    setIsSaving(true);

    const payload: PlayerGuardianUpsertInput = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      documentType: form.documentType as DocumentType,
      documentNumber: form.documentNumber.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      relationship: form.relationship.trim(),
      version: isStaffGuardian(guardian) ? guardian.version : null,
    };

    try {
      const saved = await upsertPlayerGuardian(id, payload);
      if (saved) {
        setGuardian(saved);
        setForm(formFromGuardian(saved));
        setGuardianMissing(false);
        setSuccessMessage("Los datos del tutor se guardaron correctamente.");
      }
      setReloadKey((current) => current + 1);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        markSessionExpired();
        return;
      }

      if (error instanceof ApiError && error.fieldErrors) {
        setFieldErrors(error.fieldErrors);
        setFormError("Revisa los campos marcados e intenta nuevamente.");
      } else {
        setActionError(
          error instanceof Error
            ? error.message
            : "No se pudo guardar al tutor.",
        );
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleConsentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSavingConsent || !isStaffGuardian(guardian)) {
      return;
    }

    setConsentError(null);
    setActionError(null);
    setSuccessMessage(null);

    if (!consentStatus) {
      setConsentError("Selecciona el nuevo estado del consentimiento.");
      return;
    }

    if (evidenceUrl.trim() && !isHttpUrl(evidenceUrl.trim())) {
      setConsentError("La evidencia debe ser un enlace web válido.");
      return;
    }

    if (consentNote.trim().length > 500) {
      setConsentError("La nota no debe superar 500 caracteres.");
      return;
    }

    setIsSavingConsent(true);
    const input: GuardianConsentUpdateInput = {
      status: consentStatus,
      evidenceUrl: evidenceUrl.trim() || null,
      note: consentNote.trim() || null,
    };

    try {
      const saved = await updateGuardianConsent(id, input);
      if (saved) {
        setGuardian(saved);
        setConsentStatus("");
        setSuccessMessage("El consentimiento se actualizó correctamente.");
      }
      setReloadKey((current) => current + 1);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        markSessionExpired();
        return;
      }

      setConsentError(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el consentimiento.",
      );
    } finally {
      setIsSavingConsent(false);
    }
  }

  const staffGuardian = isStaffGuardian(guardian) ? guardian : null;
  const scoutGuardian =
    guardian && !isStaffGuardian(guardian) ? guardian : null;
  const staffDetail = player && "guardianRequired" in player ? player : null;
  const scoutDetail =
    player && "guardianDataAvailable" in player ? player : null;
  const minor = staffDetail
    ? staffDetail.guardianRequired
    : scoutDetail
      ? (player?.age ?? 0) < 18
      : false;
  const profileInactive =
    player && "operationalStatus" in player
      ? player.operationalStatus === "INACTIVE"
      : false;
  const writable = canWrite && minor && !profileInactive;
  const consentStatuses = allowedConsentStatuses(
    staffGuardian?.consent.status ?? null,
  );

  return (
    <div>
      <header className="pageHeader">
        <div>
          <p className="eyebrow">JUGADORES · TUTOR</p>
          <h1>Ficha del tutor</h1>
          <p>
            {canWrite
              ? "Registra o actualiza los datos del tutor y el consentimiento. Este formulario no admite correo del tutor."
              : "Consulta de solo lectura de los datos del tutor y del estado de consentimiento."}
          </p>
        </div>
        <Link
          className="button buttonSecondary"
          href={playerDetailPath(id)}
        >
          Volver a la ficha
        </Link>
      </header>

      {successMessage ? (
        <Alert variant="success" title="Tutor actualizado">
          <p>{successMessage}</p>
        </Alert>
      ) : null}

      {actionError ? (
        <Alert variant="error" title="No se pudo completar la acción">
          <p>{actionError}</p>
          <button
            className="linkButton"
            type="button"
            onClick={() => setActionError(null)}
          >
            Cerrar aviso
          </button>
        </Alert>
      ) : null}

      {isLoading || isRequestLoading ? (
        <InlineLoading message="Cargando tutor…" />
      ) : loadError || !player ? (
        <Alert variant="error" title="No se pudo cargar la ficha">
          <p>{loadError ?? "El jugador no está disponible."}</p>
          <button
            className="linkButton"
            type="button"
            onClick={() => setReloadKey((current) => current + 1)}
          >
            Reintentar
          </button>
        </Alert>
      ) : !minor ? (
        <StatePanel title="Tutor no aplicable">
          <p>
            El jugador es mayor de edad. Los datos del tutor no se muestran para
            jugadores adultos.
          </p>
        </StatePanel>
      ) : guardianMissing && canWrite ? (
        <>
          <Alert variant="info" title="Tutor sin registrar">
            <p>
              El perfil es de un menor y aún no tiene tutor. Completa los datos
              para que el perfil pueda considerarse completo.
            </p>
          </Alert>

          {profileInactive ? (
            <Alert variant="warning" title="Perfil inhabilitado">
              <p>
                El perfil está en solo lectura. No se puede registrar o editar
                tutor hasta que un administrador lo reactive.
              </p>
            </Alert>
          ) : null}

          <section className="card" aria-labelledby="guardian-form-title">
            <h2 className="cardTitle" id="guardian-form-title">
              Registrar tutor
            </h2>
            <form onSubmit={handleGuardianSubmit} noValidate>
              <GuardianFields
                form={form}
                errors={fieldErrors}
                disabled={!writable || isSaving}
                onChange={updateForm}
              />
              {formError ? (
                <Alert variant="error" title="Revisa el formulario">
                  <p>{formError}</p>
                </Alert>
              ) : null}
              <div className="formActions">
                <button
                  className="button buttonPrimary"
                  type="submit"
                  disabled={!writable || isSaving}
                >
                  {isSaving ? "Guardando…" : "Guardar tutor"}
                </button>
              </div>
            </form>
          </section>
        </>
      ) : (
        <>
          {profileInactive ? (
            <Alert variant="warning" title="Perfil inhabilitado">
              <p>
                El perfil está en solo lectura. Los datos del tutor se muestran
                sin edición.
              </p>
            </Alert>
          ) : null}

          <section className="card" aria-labelledby="guardian-data-title">
            <h2 className="cardTitle" id="guardian-data-title">
              Datos del tutor
            </h2>
            {guardian ? (
              <dl className="metaList">
                <div>
                  <dt>Nombre</dt>
                  <dd>
                    {guardian.firstName} {guardian.lastName}
                  </dd>
                </div>
                <div>
                  <dt>Documento</dt>
                  <dd>
                    {documentTypeLabel(guardian.documentType)}{" "}
                    {guardian.documentNumber}
                  </dd>
                </div>
                <div>
                  <dt>Teléfono</dt>
                  <dd>{guardian.phone}</dd>
                </div>
                <div>
                  <dt>Dirección</dt>
                  <dd>{guardian.address}</dd>
                </div>
                <div>
                  <dt>Parentesco</dt>
                  <dd>{guardian.relationship}</dd>
                </div>
                {staffGuardian ? (
                  <div>
                    <dt>Última actualización</dt>
                    <dd>{formatDateTime(staffGuardian.updatedAt)}</dd>
                  </div>
                ) : null}
              </dl>
            ) : (
              <p>No hay datos de tutor registrados.</p>
            )}
          </section>

          <section className="card sectionSpacer" aria-labelledby="consent-title">
            <h2 className="cardTitle" id="consent-title">
              Consentimiento
            </h2>
            {guardian ? (
              <>
                <dl className="metaList">
                  <div>
                    <dt>Estado</dt>
                    <dd>
                      {CONSENT_STATUS_LABELS[guardian.consent.status]}
                    </dd>
                  </div>
                  <div>
                    <dt>Registrado</dt>
                    <dd>{formatDateTime(guardian.consent.recordedAt)}</dd>
                  </div>
                  {staffGuardian ? (
                    <>
                      <div>
                        <dt>Registrado por</dt>
                        <dd>
                          {staffGuardian.consent.recordedBy
                            ? `${staffGuardian.consent.recordedBy.firstName} ${staffGuardian.consent.recordedBy.lastName}`
                            : "—"}
                        </dd>
                      </div>
                      <div>
                        <dt>Evidencia</dt>
                        <dd>{staffGuardian.consent.evidenceUrl || "—"}</dd>
                      </div>
                      <div>
                        <dt>Nota</dt>
                        <dd>{staffGuardian.consent.note || "—"}</dd>
                      </div>
                    </>
                  ) : null}
                </dl>

                {canWrite && !profileInactive ? (
                  <form
                    className="form sectionSpacer"
                    onSubmit={handleConsentSubmit}
                    noValidate
                  >
                    <h3 className="formSectionTitle">
                      Registrar cambio de consentimiento
                    </h3>
                    <SelectField
                      label="Nuevo estado"
                      name="consentStatus"
                      value={consentStatus}
                      onChange={(event) =>
                        setConsentStatus(
                          event.target.value as "GRANTED" | "DENIED" | "REVOKED",
                        )
                      }
                      disabled={isSavingConsent}
                      required
                    >
                      <option value="">Selecciona un estado</option>
                      {consentStatuses.map((status) => (
                        <option key={status} value={status}>
                          {CONSENT_STATUS_LABELS[status]}
                        </option>
                      ))}
                    </SelectField>
                    <TextField
                      label="Enlace de la evidencia"
                      name="evidenceUrl"
                      type="url"
                      value={evidenceUrl}
                      onChange={(event) => setEvidenceUrl(event.target.value)}
                      hint="Opcional. Solo enlaces web; no se cargan archivos."
                      maxLength={500}
                      disabled={isSavingConsent}
                    />
                    <TextField
                      label="Nota"
                      name="consentNote"
                      value={consentNote}
                      onChange={(event) => setConsentNote(event.target.value)}
                      hint="Opcional. Máximo 500 caracteres."
                      maxLength={500}
                      disabled={isSavingConsent}
                    />
                    {consentError ? (
                      <Alert variant="error" title="No se pudo registrar">
                        <p>{consentError}</p>
                      </Alert>
                    ) : null}
                    <div className="formActions">
                      <button
                        className="button buttonPrimary"
                        type="submit"
                        disabled={isSavingConsent}
                      >
                        {isSavingConsent
                          ? "Guardando…"
                          : "Registrar consentimiento"}
                      </button>
                    </div>
                  </form>
                ) : null}
              </>
            ) : (
              <p>
                No hay consentimiento registrado. Primero registra al tutor.
              </p>
            )}
          </section>

          {canWrite && !profileInactive ? (
            <section className="card sectionSpacer" aria-labelledby="guardian-edit-title">
              <h2 className="cardTitle" id="guardian-edit-title">
                Editar datos del tutor
              </h2>
              <form onSubmit={handleGuardianSubmit} noValidate>
                <GuardianFields
                  form={form}
                  errors={fieldErrors}
                  disabled={isSaving}
                  onChange={updateForm}
                />
                {formError ? (
                  <Alert variant="error" title="Revisa el formulario">
                    <p>{formError}</p>
                  </Alert>
                ) : null}
                <div className="formActions">
                  <button
                    className="button buttonPrimary"
                    type="submit"
                    disabled={isSaving}
                  >
                    {isSaving ? "Guardando…" : "Guardar cambios del tutor"}
                  </button>
                </div>
              </form>
            </section>
          ) : null}
        </>
      )}

      {scoutGuardian ? (
        <p className="footnote">
          Vista de ojeador: solo se muestran estado y fecha del consentimiento.
          No se incluyen evidencia, nota ni usuario responsable.
        </p>
      ) : null}

      <p className="footnote">
        Los datos de menores se muestran de forma privada. No se guardan datos
        del tutor en el navegador ni en el historial deportivo.
      </p>
    </div>
  );
}

function GuardianFields({
  form,
  errors,
  disabled,
  onChange,
}: {
  form: GuardianFormState;
  errors: FieldErrors;
  disabled: boolean;
  onChange: <K extends keyof GuardianFormState>(
    key: K,
    value: GuardianFormState[K],
  ) => void;
}) {
  return (
    <div className="form">
      <div className="formGrid">
        <TextField
          label="Nombres del tutor"
          name="firstName"
          value={form.firstName}
          onChange={(event) => onChange("firstName", event.target.value)}
          error={errors.firstName}
          maxLength={100}
          disabled={disabled}
          required
        />
        <TextField
          label="Apellidos del tutor"
          name="lastName"
          value={form.lastName}
          onChange={(event) => onChange("lastName", event.target.value)}
          error={errors.lastName}
          maxLength={100}
          disabled={disabled}
          required
        />
      </div>
      <div className="formGrid">
        <SelectField
          label="Tipo de documento"
          name="documentType"
          value={form.documentType}
          onChange={(event) => onChange("documentType", event.target.value)}
          error={errors.documentType}
          disabled={disabled}
          required
        >
          <option value="DNI">DNI</option>
          <option value="CE">Carné de extranjería</option>
          <option value="PASSPORT">Pasaporte</option>
        </SelectField>
        <TextField
          label="Número de documento"
          name="documentNumber"
          value={form.documentNumber}
          onChange={(event) => onChange("documentNumber", event.target.value)}
          error={errors.documentNumber}
          maxLength={30}
          disabled={disabled}
          required
        />
      </div>
      <div className="formGrid">
        <TextField
          label="Teléfono"
          name="phone"
          type="tel"
          value={form.phone}
          onChange={(event) => onChange("phone", event.target.value)}
          error={errors.phone}
          maxLength={20}
          disabled={disabled}
          required
        />
        <TextField
          label="Parentesco"
          name="relationship"
          value={form.relationship}
          onChange={(event) => onChange("relationship", event.target.value)}
          error={errors.relationship}
          maxLength={80}
          disabled={disabled}
          required
        />
      </div>
      <TextField
        label="Dirección"
        name="address"
        value={form.address}
        onChange={(event) => onChange("address", event.target.value)}
        error={errors.address}
        maxLength={300}
        disabled={disabled}
        required
      />
    </div>
  );
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
