"use client";

import Link from "next/link";
import { Modal } from "@/components/ui/modal";
import type { UserStatus } from "@/types/api";
import { useAuth } from "../auth-provider";
import { fullName, roleLabel, statusLabel } from "../user-labels";

const STATUS_BADGES: Record<UserStatus, string> = {
  ACTIVE: "statusActive",
  PENDING_APPROVAL: "statusPending",
  INACTIVE: "statusInactive",
};

export function AccountDialog({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <Modal title="Mi cuenta" onClose={onClose}>
      <p>Datos de tu cuenta y acceso. Esta información solo se muestra aquí.</p>

      <dl className="metaList modalSection">
        <div>
          <dt>Nombre</dt>
          <dd>{fullName(user)}</dd>
        </div>
        <div>
          <dt>Correo</dt>
          <dd>{user.email}</dd>
        </div>
        <div>
          <dt>Rol</dt>
          <dd>{roleLabel(user.role)}</dd>
        </div>
        <div>
          <dt>Estado</dt>
          <dd>
            <span className={`statusBadge ${STATUS_BADGES[user.status]}`}>
              {statusLabel(user.status)}
            </span>
          </dd>
        </div>
      </dl>

      <div className="modalActions">
        <button
          className="button buttonSecondary"
          type="button"
          onClick={onClose}
          autoFocus
        >
          Cerrar
        </button>
        <Link
          className="button buttonPrimary"
          href="/cambiar-password"
          onClick={onClose}
        >
          Cambiar contraseña
        </Link>
      </div>
    </Modal>
  );
}
