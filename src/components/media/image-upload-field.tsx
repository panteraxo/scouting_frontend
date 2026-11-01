/* eslint-disable @next/next/no-img-element */
"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { UploadProgress } from "@/components/media/upload-progress";
import {
  IMAGE_ACCEPT,
  resizeImageToJpeg,
  validateImageFile,
} from "@/features/media/image-resize";
import {
  mediaErrorMessage,
  uploadMediaFile,
  type MediaPurpose,
} from "@/features/media/media-api";

type UploadStatus = "idle" | "processing" | "uploading" | "error";

interface ImageUploadFieldProps {
  label: string;
  name: string;
  /** URL ya guardada (photoUrl/logoUrl). Nunca se muestra como campo de texto. */
  value: string | null;
  purpose: MediaPurpose;
  onChange: (value: string | null) => void;
  /** Avisa al formulario que hay una subida en curso para bloquear el envío. */
  onUploadingChange?: (uploading: boolean) => void;
  error?: string;
  hint?: string;
  disabled?: boolean;
}

/**
 * Campo de imagen: selecciona un archivo local, lo reduce a 1600 px de ancho,
 * lo comprime a JPEG y lo sube a R2. No expone la URL al usuario.
 */
export function ImageUploadField({
  label,
  name,
  value,
  purpose,
  onChange,
  onUploadingChange,
  error,
  hint,
  disabled = false,
}: ImageUploadFieldProps) {
  const fieldId = name;
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const busy = status === "processing" || status === "uploading";

  useEffect(() => {
    onUploadingChange?.(busy);
  }, [busy, onUploadingChange]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, []);

  function replacePreview(file: File | null) {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    const nextUrl = file ? URL.createObjectURL(file) : null;
    previewUrlRef.current = nextUrl;
    setPreviewSrc(nextUrl);
  }

  function resetInput() {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function clearError() {
    setLocalError(null);
    setStatus("idle");
    setProgress(0);
  }

  function handleRemove() {
    replacePreview(null);
    setPendingFile(null);
    clearError();
    resetInput();
    onChange(null);
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    resetInput();

    if (!selected) {
      return;
    }

    const validation = validateImageFile(selected);
    if (validation) {
      replacePreview(null);
      setPendingFile(null);
      setProgress(0);
      setStatus("error");
      setLocalError(validation);
      return;
    }

    void prepareAndUpload(selected);
  }

  async function prepareAndUpload(file: File) {
    setLocalError(null);
    setProgress(0);
    setStatus("processing");
    setPendingFile(null);

    let prepared: File;
    try {
      prepared = await resizeImageToJpeg(file);
    } catch (reason) {
      replacePreview(null);
      setStatus("error");
      setLocalError(mediaErrorMessage(reason));
      return;
    }

    replacePreview(prepared);
    setPendingFile(prepared);
    await sendUpload(prepared);
  }

  async function sendUpload(file: File) {
    setLocalError(null);
    setProgress(0);
    setStatus("uploading");

    try {
      const uploaded = await uploadMediaFile({
        kind: "IMAGE",
        purpose,
        file,
        onProgress: setProgress,
      });

      onChange(uploaded.publicUrl ?? uploaded.stableUrl);
      replacePreview(null);
      setPendingFile(null);
      setProgress(100);
      setStatus("idle");
    } catch (reason) {
      // Un preview local no significa que el archivo ya esté en R2. Si la
      // subida falla, se retira para que el formulario no parezca completo.
      replacePreview(null);
      setStatus("error");
      setLocalError(mediaErrorMessage(reason));
    }
  }

  const displaySrc = previewSrc ?? value;
  const message = localError ?? error;
  const errorId = message ? `${fieldId}-error` : null;
  const hintId = hint ? `${fieldId}-hint` : null;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ");

  return (
    <div className="field">
      <span className="fieldLabel">{label}</span>

      <div className="mediaField">
        {displaySrc ? (
          <div className="mediaPreview">
            <img
              src={displaySrc}
              alt={`Vista previa de ${label.toLowerCase()}`}
            />
          </div>
        ) : (
          <p className="mediaEmpty">Sin imagen seleccionada.</p>
        )}

        <input
          ref={inputRef}
          id={fieldId}
          name={`${name}File`}
          type="file"
          accept={IMAGE_ACCEPT}
          className="srOnly"
          aria-label={label}
          aria-describedby={describedBy || undefined}
          aria-invalid={message ? true : undefined}
          disabled={disabled || busy}
          onChange={handleChange}
        />

        <div className="mediaActions">
          <button
            className="button buttonSecondary buttonSmall"
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || busy}
          >
            {displaySrc ? "Cambiar imagen" : "Seleccionar imagen"}
          </button>

          {displaySrc || value ? (
            <button
              className="button buttonGhost buttonSmall"
              type="button"
              onClick={handleRemove}
              disabled={disabled || busy}
            >
              Quitar
            </button>
          ) : null}

          {status === "error" && pendingFile ? (
            <button
              className="button buttonSecondary buttonSmall"
              type="button"
              onClick={() => void sendUpload(pendingFile)}
              disabled={disabled || busy}
            >
              Reintentar subida
            </button>
          ) : null}
        </div>

        {status === "processing" ? (
          <p className="mediaStatus" role="status" aria-live="polite">
            Optimizando imagen…
          </p>
        ) : null}

        {status === "uploading" ? (
          <UploadProgress percent={progress} label="Subiendo imagen…" />
        ) : null}

        {status === "idle" && value ? (
          <p className="mediaStatus" role="status" aria-live="polite">
            Imagen cargada.
          </p>
        ) : null}
      </div>

      {hint ? (
        <p className="fieldHint" id={hintId ?? undefined}>
          {hint}
        </p>
      ) : null}
      {message ? (
        <p className="fieldError" id={errorId ?? undefined}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
