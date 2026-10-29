"use client";

import Link from "next/link";
import { StatePanel } from "@/components/ui/loading";

export function PlayerAccessRestricted({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div>
      <header className="pageHeader">
        <div>
          <p className="eyebrow">JUGADORES</p>
          <h1>{title}</h1>
          <p>{message}</p>
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
        <p>Tu cuenta no tiene permisos para este módulo.</p>
      </StatePanel>
    </div>
  );
}
