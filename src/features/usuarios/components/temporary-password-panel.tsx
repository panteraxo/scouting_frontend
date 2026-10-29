"use client";

import { useId, useState } from "react";
import { Alert } from "@/components/ui/alert";

const expiryFormatter = new Intl.DateTimeFormat("es-PE", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "America/Lima",
});

function formatExpiry(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "una fecha no disponible";
  }

  return expiryFormatter.format(date);
}

interface TemporaryPasswordPanelProps {
  temporaryPassword: string;
  temporaryPasswordExpiresAt: string;
  title?: string;
  onDismiss?: () => void;
}

/**
 * Muestra una contraseña temporal únicamente en memoria. No se guarda en
 * localStorage, sessionStorage, cookies ni logs.
 */
export function TemporaryPasswordPanel({
  temporaryPassword,
  temporaryPasswordExpiresAt,
  title = "Contraseña temporal generada",
  onDismiss,
}: TemporaryPasswordPanelProps) {
  const inputId = useId();
  const [copyState, setCopyState] = useState<
    "idle" | "copied" | "manual"
  >("idle");

  async function handleCopy() {
    try {
      if (!navigator.clipboard?.writeText) {
        setCopyState("manual");
        return;
      }

      await navigator.clipboard.writeText(temporaryPassword);
      setCopyState("copied");
    } catch {
      setCopyState("manual");
    }
  }

  return (
    <section aria-label={title}>
      <Alert variant="warning" title={title}>
        <p>
          Esta contraseña se muestra una sola vez y no queda guardada en el
          navegador. Cópiala ahora y entrégala por un canal seguro.
        </p>

        <label className="fieldLabel" htmlFor={inputId}>
          Contraseña temporal
        </label>
        <input
          className="input secretInput"
          id={inputId}
          type="text"
          value={temporaryPassword}
          readOnly
          autoComplete="off"
          spellCheck={false}
          onFocus={(event) => event.currentTarget.select()}
          aria-describedby={`${inputId}-expiry`}
        />
        <p className="fieldHint" id={`${inputId}-expiry`}>
          Vence el {formatExpiry(temporaryPasswordExpiresAt)}. El usuario deberá
          cambiarla en su próximo acceso.
        </p>

        <div className="rowActions">
          <button
            className="button buttonSecondary buttonSmall"
            type="button"
            onClick={handleCopy}
            autoFocus
          >
            Copiar contraseña
          </button>
          {onDismiss ? (
            <button
              className="button buttonGhost buttonSmall"
              type="button"
              onClick={onDismiss}
            >
              Ocultar contraseña
            </button>
          ) : null}
        </div>

        <p className="fieldHint" role="status" aria-live="polite">
          {copyState === "copied"
            ? "Contraseña copiada al portapapeles."
            : null}
          {copyState === "manual"
            ? "No se pudo acceder al portapapeles. Selecciona el texto y cópialo manualmente."
            : null}
        </p>
      </Alert>
    </section>
  );
}
