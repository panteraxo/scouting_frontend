import { ApiError, apiMutation } from "@/lib/api-client";

/**
 * Capa central de subida de medios.
 *
 * Flujo acordado con el backend:
 * 1. POST /media/uploads            -> URL presignada (PUT) para subir directo a R2.
 * 2. PUT <uploadUrl>                -> subida binaria directa, sin CSRF ni cookies de sesión.
 * 3. POST /media/{mediaId}/complete -> confirma el objeto y devuelve la URL estable.
 *
 * El paso 3 solo se ejecuta después de que el PUT haya terminado correctamente.
 */

export type MediaKind = "IMAGE" | "VIDEO";

/**
 * Propósitos usados por el frontend. El backend los recibe como texto y debe
 * validar el permiso correspondiente. Si cambia el catálogo, actualizar aquí.
 */
export const MEDIA_PURPOSES = {
  playerPhoto: "PLAYER_PHOTO",
  playerHistoryVideo: "PLAYER_HISTORY_VIDEO",
  prospectEvaluationVideo: "PROSPECT_EVALUATION_VIDEO",
  organizationLogo: "ORGANIZATION_LOGO",
} as const;

export type MediaPurpose = (typeof MEDIA_PURPOSES)[keyof typeof MEDIA_PURPOSES];

/** El backend devuelve el identificador como número (Long) o, si cambia, como texto. */
export type MediaId = string | number;

export interface RequestMediaUploadInput {
  kind: MediaKind;
  purpose: MediaPurpose;
  contentType: string;
  sizeBytes: number;
}

export interface RequestMediaUploadResponse {
  mediaId: MediaId;
  uploadUrl: string;
  method: string;
  headers: Record<string, string>;
  publicUrl: string | null;
  playbackPath: string | null;
}

export interface CompleteMediaUploadResponse {
  mediaId: MediaId;
  kind: MediaKind;
  publicUrl: string | null;
  playbackPath: string | null;
  contentType: string;
  sizeBytes: number;
}

export interface UploadedMedia {
  mediaId: MediaId;
  /** URL pública estable (solo imágenes). */
  publicUrl: string | null;
  /** Ruta de reproducción autenticada (solo video). */
  playbackPath: string | null;
  /**
   * Valor que debe guardarse en `photoUrl` / `videoUrl`:
   * - imagen: URL pública de R2;
   * - video: URL autenticada `${API_BASE_URL}/media/{id}/play`.
   */
  stableUrl: string;
}

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "https://scouting-backend-0diz.onrender.com/api/v1"
).replace(/\/+$/, "");

/** URL estable de reproducción para un video privado. Requiere sesión activa. */
export function mediaPlaybackUrl(mediaId: MediaId): string {
  return `${API_BASE_URL}/media/${encodeURIComponent(String(mediaId))}/play`;
}

/**
 * Indica si el valor guardado corresponde a la reproducción autenticada del
 * backend (`.../media/{id}/play`) y no a un enlace externo heredado.
 */
export function isMediaPlaybackUrl(value: string | null | undefined): boolean {
  return (
    typeof value === "string" &&
    /\/media\/[^/]+\/play(?:[?#].*)?$/.test(value)
  );
}

/** Solicita una URL presignada de subida. Requiere CSRF. */
export async function requestMediaUpload(
  input: RequestMediaUploadInput,
): Promise<RequestMediaUploadResponse> {
  const response = await apiMutation<RequestMediaUploadResponse>(
    "/media/uploads",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );

  if (!response?.uploadUrl) {
    throw new ApiError(
      "El servidor no devolvió una URL de subida. Intenta nuevamente.",
      { status: 500 },
    );
  }

  return response;
}

/** Confirma la subida y obtiene las URLs estables. Debe llamarse tras un PUT exitoso. */
export async function completeMediaUpload(
  mediaId: MediaId,
): Promise<CompleteMediaUploadResponse> {
  return apiMutation<CompleteMediaUploadResponse>(
    `/media/${encodeURIComponent(String(mediaId))}/complete`,
    { method: "POST" },
  );
}

interface PutFileOptions {
  url: string;
  file: Blob;
  method?: string;
  headers?: Record<string, string>;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

/**
 * Sube el binario directamente al almacenamiento con XHR (permite progreso).
 * No envía CSRF ni cookies de la aplicación: solo los headers presignados.
 */
export function putFileToStorage({
  url,
  file,
  method = "PUT",
  headers = {},
  onProgress,
  signal,
}: PutFileOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Subida cancelada.", "AbortError"));
      return;
    }

    const request = new XMLHttpRequest();
    request.open(method, url);

    for (const [key, value] of Object.entries(headers)) {
      try {
        request.setRequestHeader(key, value);
      } catch {
        reject(
          new Error(
            "El servidor envió un encabezado de subida no válido. Intenta nuevamente.",
          ),
        );
        return;
      }
    }

    request.upload.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) {
        return;
      }
      onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    };

    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress?.(100);
        resolve();
        return;
      }

      reject(
        new Error(
          request.status === 0
            ? "No se pudo conectar con el almacenamiento. Verifica tu conexión e intenta nuevamente."
            : `El almacenamiento rechazó la subida (código ${request.status}). Intenta nuevamente.`,
        ),
      );
    };

    request.onerror = () => {
      reject(
        new Error(
          "No se pudo conectar con el almacenamiento. Verifica tu conexión e intenta nuevamente.",
        ),
      );
    };

    request.onabort = () => {
      reject(new DOMException("Subida cancelada.", "AbortError"));
    };

    if (signal) {
      signal.addEventListener("abort", () => request.abort(), { once: true });
    }

    request.send(file);
  });
}

interface UploadMediaOptions {
  kind: MediaKind;
  purpose: MediaPurpose;
  file: File;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

/**
 * Orquesta la subida completa: presignado -> PUT a R2 -> confirmación.
 * La confirmación nunca se ejecuta si el PUT falla.
 */
export async function uploadMediaFile({
  kind,
  purpose,
  file,
  onProgress,
  signal,
}: UploadMediaOptions): Promise<UploadedMedia> {
  const created = await requestMediaUpload({
    kind,
    purpose,
    contentType: file.type,
    sizeBytes: file.size,
  });

  await putFileToStorage({
    url: created.uploadUrl,
    file,
    method: created.method || "PUT",
    headers: created.headers ?? {},
    onProgress,
    signal,
  });

  const completed = await completeMediaUpload(created.mediaId);
  const publicUrl = completed?.publicUrl ?? created.publicUrl ?? null;
  const playbackPath = completed?.playbackPath ?? created.playbackPath ?? null;
  const mediaId = completed?.mediaId ?? created.mediaId;

  if (kind === "IMAGE" && !publicUrl) {
    throw new Error(
      "El servidor no devolvió la URL pública de la imagen. Intenta nuevamente.",
    );
  }

  return {
    mediaId,
    publicUrl,
    playbackPath,
    stableUrl: kind === "VIDEO" ? mediaPlaybackUrl(mediaId) : (publicUrl as string),
  };
}

/** Mensaje legible para errores de subida. No expone detalles técnicos ni tokens. */
export function mediaErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof DOMException && error.name === "AbortError") {
    return "La subida se canceló.";
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "No se pudo subir el archivo. Intenta nuevamente.";
}
