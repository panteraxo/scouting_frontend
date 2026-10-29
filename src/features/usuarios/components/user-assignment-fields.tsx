"use client";

import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import {
  SelectField,
  TextField,
} from "@/components/ui/form-field";
import type { UserRole } from "@/types/api";
import type { OrganizationOption } from "../api";
import {
  CREATABLE_USER_ROLES,
  USER_ROLE_OPTIONS,
  roleRequiresAcademy,
  roleRequiresClub,
} from "../labels";
import { ADMIN_ORGANIZATION_PATH } from "@/features/organizations/routes";

interface UserAssignmentFieldsProps {
  role: UserRole;
  roleOptions?: UserRole[];
  academyId: string;
  clubId: string;
  position: string;
  errors: Record<string, string>;
  academies: OrganizationOption[];
  clubs: OrganizationOption[];
  optionsLoading: boolean;
  optionsError: string | null;
  disabled?: boolean;
  onRoleChange: (role: UserRole) => void;
  onAcademyChange: (value: string) => void;
  onClubChange: (value: string) => void;
  onPositionChange: (value: string) => void;
}

function roleOptionLabel(role: UserRole): string {
  return USER_ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role;
}

function activeOptionsHint(
  kind: "academia" | "club",
  options: OrganizationOption[],
  loading: boolean,
): string | undefined {
  if (loading) {
    return "Cargando organizaciones activas…";
  }

  if (options.length === 0) {
    return `No hay ${kind === "academia" ? "academias activas" : "clubes activos"} disponibles. Crea o reactiva una organización antes de asignar este rol.`;
  }

  return `Solo se muestran ${kind === "academia" ? "academias" : "clubes"} activos.`;
}

export function UserAssignmentFields({
  role,
  roleOptions,
  academyId,
  clubId,
  position,
  errors,
  academies,
  clubs,
  optionsLoading,
  optionsError,
  disabled,
  onRoleChange,
  onAcademyChange,
  onClubChange,
  onPositionChange,
}: UserAssignmentFieldsProps) {
  const allowedRoles = roleOptions ?? CREATABLE_USER_ROLES;
  const needsAcademy = roleRequiresAcademy(role);
  const needsClub = roleRequiresClub(role);

  return (
    <div className="formSection">
      <h3 className="formSectionTitle">Rol y organización</h3>
      <p className="formSectionNote">
        Cada cuenta tiene un único rol. Profesor y Director de academia requieren
        una academia; Responsable de club requiere un club y su cargo. Los roles
        Administrador y Ojeador no se asignan a una organización. Las cuentas de
        Jugador se crean junto con su perfil desde Jugadores → Nuevo jugador.
      </p>

      {optionsError ? (
        <Alert variant="error" title="No se pudieron cargar las organizaciones">
          <p>{optionsError}</p>
        </Alert>
      ) : null}

      <div className="formGrid">
        <SelectField
          label="Rol"
          name="role"
          value={role}
          onChange={(event) => onRoleChange(event.target.value as UserRole)}
          error={errors.role}
          disabled={disabled || allowedRoles.length <= 1}
          required
        >
          {allowedRoles.map((option) => (
            <option key={option} value={option}>
              {roleOptionLabel(option)}
            </option>
          ))}
        </SelectField>

        {needsAcademy ? (
          <SelectField
            label="Academia activa"
            name="academyId"
            value={academyId}
            onChange={(event) => onAcademyChange(event.target.value)}
            error={errors.academyId}
            hint={activeOptionsHint("academia", academies, optionsLoading)}
            disabled={disabled || optionsLoading}
            required
          >
            <option value="">Selecciona una academia</option>
            {academies.map((academy) => (
              <option key={academy.id} value={academy.id}>
                {academy.name} ({academy.code})
              </option>
            ))}
          </SelectField>
        ) : null}

        {needsClub ? (
          <SelectField
            label="Club activo"
            name="clubId"
            value={clubId}
            onChange={(event) => onClubChange(event.target.value)}
            error={errors.clubId}
            hint={activeOptionsHint("club", clubs, optionsLoading)}
            disabled={disabled || optionsLoading}
            required
          >
            <option value="">Selecciona un club</option>
            {clubs.map((club) => (
              <option key={club.id} value={club.id}>
                {club.name} ({club.code})
              </option>
            ))}
          </SelectField>
        ) : null}
      </div>

      {needsClub ? (
        <TextField
          label="Cargo del responsable (opcional)"
          name="position"
          value={position}
          onChange={(event) => onPositionChange(event.target.value)}
          error={errors.position}
          hint="El cargo se guarda en la asignación del usuario, no en los datos del club. Puede completarse ahora o después."
          disabled={disabled}
          maxLength={100}
        />
      ) : null}

      {!needsAcademy && !needsClub ? (
        <p className="fieldHint">
          Este rol no se asocia a una academia ni a un club.
        </p>
      ) : null}

      {needsAcademy && !optionsLoading && academies.length === 0 ? (
        <Link
          className="button buttonSecondary buttonSmall"
          href={ADMIN_ORGANIZATION_PATH.academy}
        >
          Gestionar academias
        </Link>
      ) : null}

      {needsClub && !optionsLoading && clubs.length === 0 ? (
        <Link
          className="button buttonSecondary buttonSmall"
          href={ADMIN_ORGANIZATION_PATH.club}
        >
          Gestionar clubes
        </Link>
      ) : null}
    </div>
  );
}

