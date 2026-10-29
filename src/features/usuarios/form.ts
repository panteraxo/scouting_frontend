import type {
  DocumentType,
  ManagedUser,
  UserIdentityInput,
  UserRole,
} from "@/types/api";

export interface IdentityFormValues {
  firstName: string;
  lastName: string;
  documentType: DocumentType;
  documentNumber: string;
  email: string;
  phone: string;
  username: string;
}

export type FormErrors = Record<string, string>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DOCUMENT_PATTERN = /^[A-Za-z0-9-]{4,30}$/;
const PHONE_PATTERN = /^[0-9+()\-\s]{6,20}$/;
const USERNAME_PATTERN = /^[A-Za-z0-9._-]{3,30}$/;

export const EMPTY_IDENTITY: IdentityFormValues = {
  firstName: "",
  lastName: "",
  documentType: "DNI",
  documentNumber: "",
  email: "",
  phone: "",
  username: "",
};

export function identityFromUser(user: ManagedUser): IdentityFormValues {
  return {
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    documentType: user.documentType ?? "DNI",
    documentNumber: user.documentNumber ?? "",
    email: user.email ?? "",
    phone: user.phone ?? "",
    username: user.username ?? "",
  };
}

/**
 * Valida únicamente las reglas visibles del formulario. La API sigue siendo la
 * autoridad para restricciones adicionales y devuelve `fieldErrors`.
 */
export function validateIdentity(values: IdentityFormValues): FormErrors {
  const errors: FormErrors = {};
  const firstName = values.firstName.trim();
  const lastName = values.lastName.trim();
  const documentNumber = values.documentNumber.trim();
  const email = values.email.trim();
  const phone = values.phone.trim();
  const username = values.username.trim();

  if (!firstName) {
    errors.firstName = "Ingresa los nombres.";
  } else if (firstName.length > 100) {
    errors.firstName = "Los nombres no deben superar 100 caracteres.";
  }

  if (!lastName) {
    errors.lastName = "Ingresa los apellidos.";
  } else if (lastName.length > 100) {
    errors.lastName = "Los apellidos no deben superar 100 caracteres.";
  }

  if (!["DNI", "CE", "PASSPORT"].includes(values.documentType)) {
    errors.documentType = "Selecciona un tipo de documento.";
  }

  if (!documentNumber) {
    errors.documentNumber = "Ingresa el número de documento.";
  } else if (!DOCUMENT_PATTERN.test(documentNumber)) {
    errors.documentNumber =
      "Usa entre 4 y 30 caracteres: letras, números o guiones.";
  }

  if (!email) {
    errors.email = "Ingresa el correo electrónico.";
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = "Ingresa un correo válido.";
  } else if (email.length > 150) {
    errors.email = "El correo no debe superar 150 caracteres.";
  }

  if (phone && !PHONE_PATTERN.test(phone)) {
    errors.phone =
      "Usa entre 6 y 20 caracteres: números, espacios, +, ( ) o guiones.";
  }

  if (!username) {
    errors.username = "Ingresa un nombre de usuario.";
  } else if (!USERNAME_PATTERN.test(username)) {
    errors.username =
      "Usa entre 3 y 30 caracteres: letras, números, punto, guion o guion bajo.";
  }

  return errors;
}

export function identityPayload(values: IdentityFormValues): UserIdentityInput {
  const phone = values.phone.trim();

  return {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    documentType: values.documentType,
    documentNumber: values.documentNumber.trim(),
    email: values.email.trim(),
    phone: phone || null,
    username: values.username.trim(),
  };
}

export function validateAssignment(
  role: UserRole,
  academyId: string,
  clubId: string,
): FormErrors {
  const errors: FormErrors = {};

  if (role === "PLAYER" || role === "PROFESSOR" || role === "ACADEMY_DIRECTOR") {
    if (!academyId) {
      errors.academyId = "Selecciona una academia activa.";
    }
  }

  if (role === "CLUB_MANAGER") {
    if (!clubId) {
      errors.clubId = "Selecciona un club activo.";
    }
  }

  return errors;
}
