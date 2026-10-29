"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
  type ChangeEvent,
} from "react";
import { Alert } from "@/components/ui/alert";
import { SelectField } from "@/components/ui/form-field";
import {
  InlineLoading,
  Spinner,
  StatePanel,
} from "@/components/ui/loading";
import { ApiError, isAbortError } from "@/lib/api-client";
import { useAuth } from "@/features/auth/auth-provider";
import {
  documentTypeLabel,
  fullName,
  statusLabel,
} from "@/features/auth/user-labels";
import {
  approveScoutRegistration,
  listScoutRegistrations,
  rejectScoutRegistration,
} from "../scout-registrations-api";
import type {
  PageResponse,
  ScoutRegistration,
  UserStatus,
} from "@/types/api";

const PAGE_SIZE = 20;

const STATUS_FILTERS: Array<{ value: UserStatus; label: string }> = [
  { value: "PENDING_APPROVAL", label: "Pendientes" },
  { value: "ACTIVE", label: "Aprobadas" },
  { value: "INACTIVE", label: "Rechazadas o inactivas" },
];

type ActionKind = "approve" | "reject";

interface PendingAction {
  registration: ScoutRegistration;
  kind: ActionKind;
}

const dateFormatter = new Intl.DateTimeFormat("es-PE", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Lima",
});

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date);
}

function badgeClass(status: UserStatus): string {
  if (status === "ACTIVE") {
    return "statusBadge statusActive";
  }

  if (status === "INACTIVE") {
    return "statusBadge statusInactive";
  }

  return "statusBadge statusPending";
}

export function ScoutRegistrationsScreen() {
  const { user, markSessionExpired } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [statusFilter, setStatusFilter] =
    useState<UserStatus>("PENDING_APPROVAL");
  const [page, setPage] = useState(0);
  const [result, setResult] =
    useState<PageResponse<ScoutRegistration> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null,
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [loadedRequestKey, setLoadedRequestKey] = useState<string | null>(
    null,
  );

  const requestKey = `${statusFilter}:${page}:${reloadKey}`;
  const isLoading = loadedRequestKey !== requestKey;

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    const controller = new AbortController();
    let isActive = true;

    listScoutRegistrations(
      { status: statusFilter, page, size: PAGE_SIZE },
      controller.signal,
    )
      .then((data) => {
        if (!isActive) {
          return;
        }

        setResult(data);
        setLoadError(null);
        setLoadedRequestKey(requestKey);

        if (data.content.length === 0 && data.page > 0) {
          setPage(Math.max(0, data.page - 1));
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

        setResult(null);
        setLoadedRequestKey(requestKey);
        setLoadError(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar las solicitudes.",
        );
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [
    isAdmin,
    statusFilter,
    page,
    requestKey,
    markSessionExpired,
  ]);

  useEffect(() => {
    if (!pendingAction) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isProcessing) {
        setPendingAction(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pendingAction, isProcessing]);

  function handleStatusChange(event: ChangeEvent<HTMLSelectElement>) {
    setStatusFilter(event.target.value as UserStatus);
    setPage(0);
    setSuccessMessage(null);
    setActionError(null);
  }

  function handleRefresh() {
    setReloadKey((current) => current + 1);
  }

  function requestAction(registration: ScoutRegistration, kind: ActionKind) {
    setActionError(null);
    setSuccessMessage(null);
    setPendingAction({ registration, kind });
  }

  async function handleConfirmAction() {
    if (!pendingAction || isProcessing) {
      return;
    }

    const { registration, kind } = pendingAction;
    setIsProcessing(true);
    setActionError(null);
    setSuccessMessage(null);

    try {
      if (kind === "approve") {
        await approveScoutRegistration(registration.id);
      } else {
        await rejectScoutRegistration(registration.id);
      }

      setPendingAction(null);
      setSuccessMessage(
        kind === "approve"
          ? `Solicitud de ${fullName(registration)} aprobada. La cuenta ya puede iniciar sesión.`
          : `Solicitud de ${fullName(registration)} rechazada. La cuenta queda inactiva.`,
      );

      if (result && result.content.length <= 1 && page > 0) {
        setPage((current) => Math.max(0, current - 1));
      } else {
        handleRefresh();
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setPendingAction(null);
        markSessionExpired();
        return;
      }

      const message =
        error instanceof ApiError &&
        error.code === "SCOUT_REGISTRATION_ALREADY_PROCESSED"
          ? "La solicitud ya fue procesada. La lista se actualizará."
          : error instanceof ApiError &&
              error.code === "SCOUT_REGISTRATION_NOT_FOUND"
            ? "La solicitud ya no existe. La lista se actualizará."
            : error instanceof Error
              ? error.message
              : "No se pudo completar la acción.";

      if (
        error instanceof ApiError &&
        (error.status === 404 || error.status === 409)
      ) {
        setPendingAction(null);
        setActionError(message);
        handleRefresh();
        return;
      }

      setActionError(message);
    } finally {
      setIsProcessing(false);
    }
  }

  if (!isAdmin) {
    return (
      <div>
        <header className="pageHeader">
          <div>
            <p className="eyebrow">ADMINISTRACIÓN</p>
            <h1>Revisión de ojeadores</h1>
            <p>Solo un administrador puede revisar solicitudes de ojeador.</p>
          </div>
        </header>

        <StatePanel
          title="Acceso restringido"
          action={
            <Link className="button buttonSecondary" href="/inicio">
              Volver al inicio
            </Link>
          }
        >
          <p>
            Tu cuenta no tiene el rol Administrador, por lo que no puede acceder a
            esta sección.
          </p>
        </StatePanel>
      </div>
    );
  }

  const totalPages = result?.totalPages ?? 0;
  const totalElements = result?.totalElements ?? 0;
  const currentPage = result?.page ?? page;
  const hasPrevious = page > 0;
  const hasNext = totalPages > 0 && page + 1 < totalPages;
  const emptyMessage =
    statusFilter === "PENDING_APPROVAL"
      ? "No hay solicitudes pendientes de revisión."
      : "No hay solicitudes con el estado seleccionado.";

  return (
    <div>
      <header className="pageHeader">
        <div>
          <p className="eyebrow">ADMINISTRACIÓN</p>
          <h1>Revisión de ojeadores</h1>
          <p>
            Aprueba o rechaza las solicitudes del registro público. La aprobación
            habilita el acceso; el rechazo deja la cuenta inactiva.
          </p>
        </div>
        <button
          className="button buttonSecondary buttonSmall"
          type="button"
          onClick={handleRefresh}
          disabled={isLoading || isProcessing}
        >
          Actualizar lista
        </button>
      </header>

      {successMessage ? (
        <Alert variant="success" title="Solicitud actualizada">
          <p>{successMessage}</p>
        </Alert>
      ) : null}

      {actionError && !pendingAction ? (
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

      <section className="card" aria-labelledby="filters-title">
        <h2 className="cardTitle" id="filters-title">
          Filtros
        </h2>
        <div className="filters">
          <SelectField
            label="Estado de la solicitud"
            name="status"
            value={statusFilter}
            onChange={handleStatusChange}
            disabled={isLoading || isProcessing}
          >
            {STATUS_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>
          <p className="filtersNote">
            La lista muestra {PAGE_SIZE} solicitudes por página.
          </p>
        </div>
      </section>

      <section className="card tableCard" aria-labelledby="results-title">
        <div className="tableHeader">
          <h2 className="cardTitle" id="results-title">
            Solicitudes
          </h2>
          {result ? (
            <p className="tableCount">
              {totalElements}{" "}
              {totalElements === 1 ? "solicitud" : "solicitudes"}
            </p>
          ) : null}
        </div>

        {isLoading ? (
          <InlineLoading message="Cargando solicitudes…" />
        ) : loadError ? (
          <Alert variant="error" title="No se pudieron cargar las solicitudes">
            <p>{loadError}</p>
            <button className="linkButton" type="button" onClick={handleRefresh}>
              Reintentar
            </button>
          </Alert>
        ) : !result || result.content.length === 0 ? (
          <StatePanel
            title={emptyMessage}
            action={
              <button
                className="button buttonSecondary buttonSmall"
                type="button"
                onClick={handleRefresh}
              >
                Actualizar
              </button>
            }
          >
            <p>
              {statusFilter === "PENDING_APPROVAL"
                ? "Las nuevas solicitudes del registro público aparecerán aquí."
                : "Cambia el filtro para consultar otro estado."}
            </p>
          </StatePanel>
        ) : (
          <>
            <div className="tableWrap">
              <table className="dataTable">
                <caption className="srOnly">
                  Solicitudes de registro de ojeadores
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Ojeador</th>
                    <th scope="col">Documento</th>
                    <th scope="col">Contacto</th>
                    <th scope="col">Registrado</th>
                    <th scope="col">Estado</th>
                    <th scope="col">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {result.content.map((registration) => (
                    <tr key={registration.id}>
                      <td>
                        <span className="cellStrong">
                          {fullName(registration)}
                        </span>
                        <span className="cellMuted">
                          @{registration.username}
                        </span>
                      </td>
                      <td>
                        <span>{registration.documentNumber}</span>
                        <span className="cellMuted">
                          {documentTypeLabel(registration.documentType)}
                        </span>
                      </td>
                      <td>
                        <span>{registration.email}</span>
                        <span className="cellMuted">
                          {registration.phone || "Sin teléfono"}
                        </span>
                      </td>
                      <td>{formatDate(registration.createdAt)}</td>
                      <td>
                        <span className={badgeClass(registration.status)}>
                          {statusLabel(registration.status)}
                        </span>
                      </td>
                      <td>
                        {registration.status === "PENDING_APPROVAL" ? (
                          <div className="rowActions">
                            <button
                              className="button buttonPrimary buttonSmall"
                              type="button"
                              onClick={() =>
                                requestAction(registration, "approve")
                              }
                              disabled={isProcessing}
                            >
                              Aprobar
                            </button>
                            <button
                              className="button buttonDanger buttonSmall"
                              type="button"
                              onClick={() =>
                                requestAction(registration, "reject")
                              }
                              disabled={isProcessing}
                            >
                              Rechazar
                            </button>
                          </div>
                        ) : (
                          <span className="cellMuted">Sin acciones</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <p className="paginationInfo">
                Página {currentPage + 1} de {Math.max(totalPages, 1)}
              </p>
              <div className="paginationActions">
                <button
                  className="button buttonSecondary buttonSmall"
                  type="button"
                  onClick={() => setPage((current) => Math.max(0, current - 1))}
                  disabled={!hasPrevious || isLoading || isProcessing}
                >
                  Anterior
                </button>
                <button
                  className="button buttonSecondary buttonSmall"
                  type="button"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={!hasNext || isLoading || isProcessing}
                >
                  Siguiente
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {pendingAction ? (
        <div
          className="modalBackdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isProcessing) {
              setPendingAction(null);
            }
          }}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-description"
          >
            <h2 id="confirm-title">
              {pendingAction.kind === "approve"
                ? "Aprobar solicitud"
                : "Rechazar solicitud"}
            </h2>
            <p id="confirm-description">
              {pendingAction.kind === "approve"
                ? "La cuenta quedará activa y el ojeador podrá iniciar sesión."
                : "La cuenta quedará inactiva y no podrá iniciar sesión."}
            </p>

            <div className="modalPerson">
              <strong>{fullName(pendingAction.registration)}</strong>
              <span>{pendingAction.registration.email}</span>
              <span>@{pendingAction.registration.username}</span>
            </div>

            {actionError ? (
              <Alert variant="error" title="No se pudo completar la acción">
                <p>{actionError}</p>
              </Alert>
            ) : null}

            <div className="modalActions">
              <button
                className="button buttonSecondary"
                type="button"
                onClick={() => setPendingAction(null)}
                disabled={isProcessing}
                autoFocus
              >
                Cancelar
              </button>
              <button
                className={
                  pendingAction.kind === "approve"
                    ? "button buttonPrimary"
                    : "button buttonDanger"
                }
                type="button"
                onClick={handleConfirmAction}
                disabled={isProcessing}
              >
                {isProcessing ? <Spinner /> : null}
                {isProcessing
                  ? "Procesando…"
                  : pendingAction.kind === "approve"
                    ? "Confirmar aprobación"
                    : "Confirmar rechazo"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
