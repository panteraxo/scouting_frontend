"use client";

import { SelectField, TextField } from "@/components/ui/form-field";
import type { IdentityFormValues } from "../form";
import type { DocumentType } from "@/types/api";

interface UserIdentityFieldsProps {
  values: IdentityFormValues;
  errors: Record<string, string>;
  disabled?: boolean;
  onChange: (field: keyof IdentityFormValues, value: string) => void;
}

export function UserIdentityFields({
  values,
  errors,
  disabled,
  onChange,
}: UserIdentityFieldsProps) {
  return (
    <>
      <div className="formGrid">
        <TextField
          label="Nombres"
          name="firstName"
          autoComplete="given-name"
          value={values.firstName}
          onChange={(event) => onChange("firstName", event.target.value)}
          error={errors.firstName}
          disabled={disabled}
          maxLength={100}
          required
        />
        <TextField
          label="Apellidos"
          name="lastName"
          autoComplete="family-name"
          value={values.lastName}
          onChange={(event) => onChange("lastName", event.target.value)}
          error={errors.lastName}
          disabled={disabled}
          maxLength={100}
          required
        />
      </div>

      <div className="formGrid">
        <SelectField
          label="Tipo de documento"
          name="documentType"
          value={values.documentType}
          onChange={(event) =>
            onChange("documentType", event.target.value as DocumentType)
          }
          error={errors.documentType}
          disabled={disabled}
          required
        >
          <option value="DNI">DNI</option>
          <option value="CE">Carné de extranjería</option>
          <option value="PASSPORT">Pasaporte</option>
        </SelectField>
        <TextField
          label="Número de documento"
          name="documentNumber"
          autoComplete="off"
          value={values.documentNumber}
          onChange={(event) => onChange("documentNumber", event.target.value)}
          error={errors.documentNumber}
          disabled={disabled}
          maxLength={30}
          required
        />
      </div>

      <div className="formGrid">
        <TextField
          label="Correo electrónico"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="nombre@ejemplo.com"
          value={values.email}
          onChange={(event) => onChange("email", event.target.value)}
          error={errors.email}
          disabled={disabled}
          maxLength={150}
          required
        />
        <TextField
          label="Teléfono"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="987654321"
          hint="Opcional. Es el teléfono propio de la cuenta."
          value={values.phone}
          onChange={(event) => onChange("phone", event.target.value)}
          error={errors.phone}
          disabled={disabled}
          maxLength={30}
        />
      </div>

      <TextField
        label="Nombre de usuario"
        name="username"
        autoComplete="username"
        hint="Entre 3 y 30 caracteres: letras, números, punto, guion o guion bajo."
        value={values.username}
        onChange={(event) => onChange("username", event.target.value)}
        error={errors.username}
        disabled={disabled}
        maxLength={30}
        required
      />
    </>
  );
}
