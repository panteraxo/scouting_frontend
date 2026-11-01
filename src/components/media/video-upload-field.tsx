"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { UploadProgress } from "@/components/media/upload-progress";
import {
  isMediaPlaybackUrl,
  mediaErrorMessage,
  uploadMediaFile,
  type MediaPurpose,
} from "@/features/media/media-api";
import {
  formatFileSize,
  validateVideoFile,
  videoContentType,
  VIDEO_ACCEPT,
} from "@/features/media/video-file";

interface VideoUploadFieldProps {
  label: string;
  name: string;
  /** URL ya guardada (videoUrl). Nunca se muestra como campo de texto. */
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
 * Campo de video: valida MP4/WebM hasta 200 MB, sube directo a R2 con progreso
 * y guarda la URL de reproducción autenticada del backend. No transcribe ni
 * convierte el formato: el navegador debe poder reproducirlo.
 */
export function VideoUploadField({
  label,
  name,
  value,
  purpose,
  onChange,
  onUploadingChange,
  error,
  hint,
  disabled = false,
}: VideoUploadFieldProps) {
  const fieldId = name;
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  useEffect(() => {
    onUploadingChange?.(isUploading);
  }, [isUploading, onUploadingChange]);

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

  function clearState() {
    replacePreview(null);
    setPendingFile(null);
    setProgress(0);
    setIsUploading(false);
    setLocalError(null);
    resetInput();
  }

  function handleRemove() {
    clearState();
    onChange(null);
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    resetInput();

    if (!selected) {
      return;
    }

    const validation = validateVideoFile(selected);
    if (validation) {
      replacePreview(null);
      setPendingFile(null);
      setProgress(0);
      setIsUploading(false);
      setLocalError(validation);
      return;
    }

    void sendUpload(selected);
  }

  async function sendUpload(file: File) {
    const contentType = videoContentType(file);
    const uploadFile =
      contentType && file.type !== contentType
        ? new File([file], file.name, { type: contentType })
        : file;

    replacePreview(file);
    setPendingFile(file);
    setLocalError(null);
    setProgress(0);
    setIsUploading(true);

    try {
      const uploaded = await uploadMediaFile({
        kind: "VIDEO",
        purpose,
        file: uploadFile,
        onProgress: setProgress,
      });

      onChange(uploaded.stableUrl);
      replacePreview(null);
      setPendingFile(null);
      setProgress(100);
      setIsUploading(false);
    } catch (reason) {
      setIsUploading(false);
      setLocalError(mediaErrorMessage(reason));
    }
  }

  const displaySrc = previewSrc ?? value;
  const isPlayback = previewSrc === null && isMediaPlaybackUrl(value);
  const message = localError ?? error;
  const errorId = message ? `${fieldId}-error` : null;
  const hintId = hint ? `${fieldId}-hint` : null;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ");

  return (
    <div className="field">
      <span className="fieldLabel">{label}</span>

      <div className="mediaField">
        {previewSrc || isPlayback ? (
          <div className="mediaPreview mediaPreviewVideo">
            <video src={displaySrc ?? undefined} controls preload="metadata">
              Tu navegador no puede reproducir este video.
            </video>
          </div>
        ) : value ? (
          <p className="mediaStatus">
            Enlace heredado:{" "}
            <a href={value} target="_blank" rel="noreferrer noopener">
              abrir video en otra pestaña
            </a>
            . Sube un archivo para usar el reproductor del sistema.
          </p>
        ) : (
          <p className="mediaEmpty">Sin video seleccionado.</p>
        )}

        <input
          ref={inputRef}
          id={fieldId}
          name={`${name}File`}
          type="file"
          accept={VIDEO_ACCEPT}
          className="srOnly"
          aria-label={label}
          aria-describedby={describedBy || undefined}
          aria-invalid={message ? true : undefined}
          disabled={disabled || isUploading}
          onChange={handleChange}
        />

        <div className="mediaActions">
          <button
            className="button buttonSecondary buttonSmall"
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || isUploading}
          >
            {displaySrc ? "Cambiar video" : "Seleccionar video"}
          </button>

          {displaySrc || value ? (
            <button
              className="button buttonGhost buttonSmall"
              type="button"
              onClick={handleRemove}
              disabled={disabled || isUploading}
            >
              Quitar
            </button>
          ) : null}

          {localError && pendingFile ? (
            <button
              className="button buttonSecondary buttonSmall"
              type="button"
              onClick={() => void sendUpload(pendingFile)}
              disabled={disabled || isUploading}
            >
              Reintentar subida
            </button>
          ) : null}
        </div>

        {isUploading ? (
          <UploadProgress percent={progress} label="Subiendo video…" />
        ) : null}

        {!isUploading && isPlayback && !previewSrc && !localError ? (
          <p className="mediaStatus" role="status" aria-live="polite">
            Video disponible para reproducción.
          </p>
        ) : null}

        {pendingFile && !isUploading ? (
          <p className="mediaStatus">
            Archivo seleccionado: {pendingFile.name} (
            {formatFileSize(pendingFile.size)}).
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
