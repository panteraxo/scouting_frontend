"use client";

import Link from "next/link";
import { StatePanel } from "@/components/ui/loading";

export function ProspectAccessRestricted({
  title = "Prospecciones",
  message,
}: {
  title?: string;
  message: string;
}) {
  return (
    <div>
      <header className="pageHeader">
        <div>
          <p className="eyebrow">PROSPECCIONES</p>
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
        <p>
          Solo un ojeador puede acceder a sus prospecciones y evaluaciones.
        </p>
      </StatePanel>
    </div>
  );
}
