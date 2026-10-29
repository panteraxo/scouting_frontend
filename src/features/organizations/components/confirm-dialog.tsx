"use client";

import { useEffect, type ReactNode } from "react";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/loading";

interface ConfirmDialogProps {
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: "primary" | "danger";
  isProcessing: boolean;
  error?: string | null;
  details?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancelar",
  variant = "primary",
  isProcessing,
  error,
  details,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isProcessing) {
        onCancel();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isProcessing, onCancel]);

  return (
    <div
      className="modalBackdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isProcessing) {
          onCancel();
        }
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="organization-confirm-title"
        aria-describedby="organization-confirm-description"
      >
        <h2 id="organization-confirm-title">{title}</h2>
        <p id="organization-confirm-description">{description}</p>

        {details ? <div className="modalPerson">{details}</div> : null}

        {error ? (
          <Alert variant="error" title="No se pudo completar la acción">
            <p>{error}</p>
          </Alert>
        ) : null}

        <div className="modalActions">
          <button
            className="button buttonSecondary"
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            autoFocus
          >
            {cancelLabel}
          </button>
          <button
            className={
              variant === "danger"
                ? "button buttonDanger"
                : "button buttonPrimary"
            }
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
          >
            {isProcessing ? <Spinner /> : null}
            {isProcessing ? "Procesando…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
