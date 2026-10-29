import type { ApiErrorBody, CsrfResponse } from "@/types/api";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://scouting-backend-0diz.onrender.com/api/v1"
).replace(/\/+$/, "");

const DEFAULT_ERROR_MESSAGES: Record<number, string> = {
  0: "No se pudo conectar. Verifica tu conexión e intenta nuevamente.",
  400: "Los datos enviados no son válidos.",
  401: "Se requiere iniciar sesión.",
  403: "No tienes permisos para realizar esta acción.",
  404: "No se encontró el recurso solicitado.",
  409: "La operación no se pudo completar porque el recurso cambió de estado.",
  500: "Ocurrió un error inesperado. Intenta nuevamente en unos minutos.",
};

interface ApiErrorOptions {
  status: number;
  code?: string;
  fieldErrors?: Record<string, string>;
  path?: string;
  timestamp?: string;
}

/** Error uniforme devuelto por la API o por un fallo de conexión. */
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly fieldErrors?: Record<string, string>;
  readonly path?: string;
  readonly timestamp?: string;

  constructor(message: string, options: ApiErrorOptions) {
    super(message);
    this.name = "ApiError";
    this.status = options.status;
    this.code = options.code;
    this.fieldErrors = options.fieldErrors;
    this.path = options.path;
    this.timestamp = options.timestamp;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: unknown }).name === "AbortError"
  );
}

async function parseErrorResponse(response: Response): Promise<ApiError> {
  let body: Partial<ApiErrorBody> | null = null;

  try {
    body = (await response.json()) as Partial<ApiErrorBody>;
  } catch {
    body = null;
  }

  const apiMessage = typeof body?.message === "string" ? body.message.trim() : "";
  const fallback =
    DEFAULT_ERROR_MESSAGES[response.status] ??
    `La solicitud falló (${response.status}).`;

  return new ApiError(apiMessage || fallback, {
    status: response.status,
    code: typeof body?.code === "string" ? body.code : undefined,
    fieldErrors:
      body?.fieldErrors && typeof body.fieldErrors === "object"
        ? body.fieldErrors
        : undefined,
    path: typeof body?.path === "string" ? body.path : undefined,
    timestamp: typeof body?.timestamp === "string" ? body.timestamp : undefined,
  });
}

/**
 * Cliente HTTP central. La sesión viaja en una cookie HttpOnly, por lo que
 * todas las peticiones usan credentials: "include". Nunca se guardan tokens
 * en localStorage.
 */
export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");

  if (init.body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
      credentials: "include",
      cache: "no-store",
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    throw new ApiError(DEFAULT_ERROR_MESSAGES[0], { status: 0 });
  }

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError("No se pudo interpretar la información recibida.", {
      status: response.status,
    });
  }
}

let csrfToken: CsrfResponse | null = null;
let csrfRequest: Promise<CsrfResponse> | null = null;

/** Obtiene y cachea en memoria el token CSRF de la sesión actual. */
export async function getCsrfToken(force = false): Promise<CsrfResponse> {
  if (!force && csrfToken) {
    return csrfToken;
  }

  if (!force && csrfRequest) {
    return csrfRequest;
  }

  const request = apiRequest<CsrfResponse>("/auth/csrf", { method: "GET" });
  csrfRequest = request;

  try {
    const token = await request;
    csrfToken = token;
    return token;
  } finally {
    if (csrfRequest === request) {
      csrfRequest = null;
    }
  }
}

/** Descarta el token CSRF cacheado (por ejemplo, al iniciar o cerrar sesión). */
export function clearCsrfToken(): void {
  csrfToken = null;
  csrfRequest = null;
}

type MutationMethod = "POST" | "PUT" | "PATCH" | "DELETE";

/** Código devuelto por la API cuando el token CSRF enviado no es válido. */
const CSRF_INVALID_CODE = "CSRF_INVALID";

/**
 * Ejecuta una escritura enviando el token CSRF en el header exacto indicado
 * por la API. Solo se reintenta cuando el 403 indica explícitamente un token
 * CSRF inválido; un 403 de autorización nunca se reintenta.
 */
export async function apiMutation<T>(
  path: string,
  init: RequestInit & { method: MutationMethod },
): Promise<T> {
  const send = async (csrf: CsrfResponse): Promise<T> => {
    const headers = new Headers(init.headers);
    headers.set(csrf.headerName, csrf.token);

    return apiRequest<T>(path, { ...init, headers });
  };

  const currentToken = await getCsrfToken();

  try {
    return await send(currentToken);
  } catch (error) {
    if (
      isApiError(error) &&
      error.status === 403 &&
      error.code === CSRF_INVALID_CODE
    ) {
      const refreshedToken = await getCsrfToken(true);
      return send(refreshedToken);
    }
    throw error;
  }
}

export { isAbortError };
