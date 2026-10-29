"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/loading";
import { ApiError } from "@/lib/api-client";
import type {
  ManagedUser,
  UserAssignmentInput,
  UserRole,
} from "@/types/api";
import type { OrganizationOption } from "../api";
import { updateUserAssignment } from "../api";
import { validateAssignment, type FormErrors } from "../form";
import {
  roleRequiresAcademy,
  roleRequiresClub,
  userAcademyId,
  userClubId,
  userPosition,
} from "../labels";
import { UserAssignmentFields } from "./user-assignment-fields";

interface UserAssignmentDialogProps {
  user: ManagedUser;
  academies: OrganizationOption[];
  clubs: OrganizationOption[];
  optionsLoading: boolean;
  optionsError: string | null;
  onSaved: (updated: ManagedUser | undefined) => void;
  onCancel: () => void;
  onSessionExpired: () => void;
}

export function UserAssignmentDialog({
  user,
  academies,
  clubs,
  optionsLoading,
  optionsError,
  onSaved,
  onCancel,
  onSessionExpired,
}: UserAssignmentDialogProps) {
  const [role, setRole] = useState<UserRole>(user.role);
  const [academyId, setAcademyId] = useState(
    userAcademyId(user) ? String(userAcademyId(user)) : "",
  );
  const [clubId, setClubId] = useState(
    userClubId(user) ? String(userClubId(user)) : "",
  );
  const [position, setPosition] = useState(userPosition(user) ?? "");
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSubmitting) {
        onCancel();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSubmitting, onCancel]);

  function handleRoleChange(nextRole: UserRole) {
    setRole(nextRole);
    setErrors({});
    setFormError(null);

    if (!roleRequiresAcademy(nextRole)) {
      setAcademyId("");
    }

    if (!roleRequiresClub(nextRole)) {
      setClubId("");
      setPosition("");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validateAssignment(role, academyId, clubId);

    if (
      !optionsLoading &&
      roleRequiresAcademy(role) &&
      academyId &&
      !academies.some((academy) => academy.id === Number(academyId))
    ) {
      nextErrors.academyId =
        "La academia actual está inhabilitada o no está disponible. Selecciona una academia activa.";
    }

    if (
      !optionsLoading &&
      roleRequiresClub(role) &&
      clubId &&
      !clubs.some((club) => club.id === Number(clubId))
    ) {
      nextErrors.clubId =
        "El club actual está inhabilitado o no está disponible. Selecciona un club activo.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setFormError("Revisa los campos marcados e intenta nuevamente.");
      return;
    }

    const input: UserAssignmentInput = { role };

    if (roleRequiresAcademy(role)) {
      input.academyId = Number(academyId);
    }

    if (roleRequiresClub(role)) {
      input.clubId = Number(clubId);
      input.position = position.trim();
    }

    setErrors({});
    setFormError(null);
    setIsSubmitting(true);

    try {
      const updated = await updateUserAssignment(user.id, input);
      onSaved(updated);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        onSessionExpired();
        return;
      }

      if (error instanceof ApiError && error.fieldErrors) {
        setErrors(error.fieldErrors);
        setFormError("Revisa los campos marcados e intenta nuevamente.");
      } else {
        setFormError(
          error instanceof Error
            ? error.message
            : "No se pudo actualizar la asignación.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="modalBackdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) {
          onCancel();
        }
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-assignment-title"
      >
        <h2 id="user-assignment-title">Cambiar rol y organización</h2>
        <p>
          Cuenta de <strong>{user.firstName} {user.lastName}</strong> (
          {user.email}). El cambio de rol ajusta la organización requerida.
        </p>

        {formError ? (
          <div className="sectionSpacer">
            <Alert variant="error" title="No se pudo actualizar la asignación">
              <p>{formError}</p>
            </Alert>
          </div>
        ) : null}

        <form className="form sectionSpacer" onSubmit={handleSubmit} noValidate>
          <UserAssignmentFields
            role={role}
            academyId={academyId}
            clubId={clubId}
            position={position}
            errors={errors}
            academies={academies}
            clubs={clubs}
            optionsLoading={optionsLoading}
            optionsError={optionsError}
            disabled={isSubmitting}
            onRoleChange={handleRoleChange}
            onAcademyChange={(value) => {
              setAcademyId(value);
              setErrors((current) => ({ ...current, academyId: "" }));
            }}
            onClubChange={(value) => {
              setClubId(value);
              setErrors((current) => ({ ...current, clubId: "" }));
            }}
            onPositionChange={(value) => {
              setPosition(value);
              setErrors((current) => ({ ...current, position: "" }));
            }}
          />

          <div className="modalActions">
            <button
              className="button buttonSecondary"
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              autoFocus
            >
              Cancelar
            </button>
            <button
              className="button buttonPrimary"
              type="submit"
              disabled={isSubmitting || optionsLoading}
            >
              {isSubmitting ? <Spinner /> : null}
              {isSubmitting ? "Guardando…" : "Guardar asignación"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
