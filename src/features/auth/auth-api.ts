import { apiMutation, apiRequest, clearCsrfToken } from "@/lib/api-client";
import type { DocumentType, UserResponse } from "@/types/api";

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterScoutInput {
  firstName: string;
  lastName: string;
  documentType: DocumentType;
  documentNumber: string;
  email: string;
  /** Opcional: se envía `null` cuando el ojeador no informa teléfono. */
  phone: string | null;
  username: string;
  password: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface RegistrationMessage {
  message: string;
}

export function getCurrentUser(signal?: AbortSignal): Promise<UserResponse> {
  return apiRequest<UserResponse>("/auth/me", { method: "GET", signal });
}

export async function loginRequest(input: LoginInput): Promise<UserResponse> {
  const user = await apiMutation<UserResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });

  // La sesión se renueva al autenticarse: el token CSRF cacheado deja de ser fiable.
  clearCsrfToken();
  return user;
}

export async function registerScoutRequest(
  input: RegisterScoutInput,
): Promise<RegistrationMessage> {
  return apiMutation<RegistrationMessage>("/auth/register/scout", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function changePasswordRequest(
  input: ChangePasswordInput,
): Promise<UserResponse> {
  const user = await apiMutation<UserResponse>("/auth/change-password", {
    method: "POST",
    body: JSON.stringify(input),
  });

  clearCsrfToken();
  return user;
}

export async function logoutRequest(): Promise<void> {
  try {
    await apiMutation<void>("/auth/logout", { method: "POST" });
  } finally {
    clearCsrfToken();
  }
}
