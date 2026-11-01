/** Validación de videos antes de subirlos. No hay transcodificación: MP4 o WebM. */

export const VIDEO_MAX_BYTES = 200 * 1024 * 1024;
export const VIDEO_ACCEPT = "video/mp4,video/webm";

const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/webm"];

const EXTENSION_TYPES: Record<string, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
};

function detectVideoType(file: File): string | null {
  if (ACCEPTED_VIDEO_TYPES.includes(file.type)) {
    return file.type;
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  return extension ? (EXTENSION_TYPES[extension] ?? null) : null;
}

/**
 * Tipo MIME del video detectado por MIME o por extensión. Algunos navegadores
 * no informan `file.type`, así que se usa para normalizar el `contentType`.
 */
export function videoContentType(file: File): string | null {
  return detectVideoType(file);
}

/** Devuelve un mensaje de error o null si el video es válido. */
export function validateVideoFile(file: File): string | null {
  if (!detectVideoType(file)) {
    return "Selecciona un video MP4 o WebM.";
  }

  if (file.size === 0) {
    return "El video seleccionado está vacío.";
  }

  if (file.size > VIDEO_MAX_BYTES) {
    return "El video no debe superar 200 MB.";
  }

  return null;
}

/** Tamaño legible para mensajes de interfaz. */
export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
