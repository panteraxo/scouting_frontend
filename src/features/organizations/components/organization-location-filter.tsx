"use client";

import { useEffect, useState } from "react";
import { SelectField } from "@/components/ui/form-field";
import { useAuth } from "@/features/auth/auth-provider";
import { ApiError, isAbortError } from "@/lib/api-client";
import type { UbigeoOption } from "@/types/api";
import { listDepartments, listProvinces } from "../organizations-api";

interface OrganizationLocationFilterProps {
  departmentCode: string;
  provinceCode: string;
  onChange: (next: {
    departmentCode: string;
    provinceCode: string;
  }) => void;
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "No se pudo cargar el catálogo de ubicaciones.";
}

/**
 * Filtro de ubicación por prefijo UBIGEO: departamento (2 dígitos) y
 * provincia/ciudad (4 dígitos). Usa el catálogo local de la API.
 */
export function OrganizationLocationFilter({
  departmentCode,
  provinceCode,
  onChange,
}: OrganizationLocationFilterProps) {
  const { markSessionExpired } = useAuth();
  const [departments, setDepartments] = useState<UbigeoOption[]>([]);
  const [departmentsError, setDepartmentsError] = useState<string | null>(null);
  const [departmentsReloadKey, setDepartmentsReloadKey] = useState(0);
  const [provincesData, setProvincesData] = useState<{
    code: string;
    items: UbigeoOption[];
  } | null>(null);
  const [provincesError, setProvincesError] = useState<{
    code: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let isActive = true;

    listDepartments(controller.signal)
      .then((data) => {
        if (isActive) {
          setDepartments(data);
          setDepartmentsError(null);
        }
      })
      .catch((error: unknown) => {
        if (!isActive || isAbortError(error)) {
          return;
        }

        if (error instanceof ApiError && error.status === 401) {
          markSessionExpired();
          return;
        }

        setDepartments([]);
        setDepartmentsError(errorMessage(error));
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [departmentsReloadKey, markSessionExpired]);

  useEffect(() => {
    if (!departmentCode) {
      return;
    }

    const controller = new AbortController();
    let isActive = true;

    listProvinces(departmentCode, controller.signal)
      .then((data) => {
        if (isActive) {
          setProvincesData({ code: departmentCode, items: data });
          setProvincesError(null);
        }
      })
      .catch((error: unknown) => {
        if (!isActive || isAbortError(error)) {
          return;
        }

        if (error instanceof ApiError && error.status === 401) {
          markSessionExpired();
          return;
        }

        setProvincesData({ code: departmentCode, items: [] });
        setProvincesError({
          code: departmentCode,
          message: errorMessage(error),
        });
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [departmentCode, markSessionExpired]);

  const provinces =
    provincesData?.code === departmentCode ? provincesData.items : [];
  const provincesErrorMessage =
    provincesError?.code === departmentCode ? provincesError.message : null;

  return (
    <div className="orgLocationFilter">
      <SelectField
        label="Departamento"
        name="departmentCode"
        value={departmentCode}
        onChange={(event) =>
          onChange({ departmentCode: event.target.value, provinceCode: "" })
        }
      >
        <option value="">Todos los departamentos</option>
        {departments.map((department) => (
          <option key={department.code} value={department.code}>
            {department.name}
          </option>
        ))}
      </SelectField>

      <SelectField
        label="Ciudad/Provincia"
        name="provinceCode"
        value={provinceCode}
        onChange={(event) =>
          onChange({
            departmentCode,
            provinceCode: event.target.value,
          })
        }
        disabled={!departmentCode}
      >
        <option value="">
          {departmentCode
            ? "Todas las provincias"
            : "Elige un departamento"}
        </option>
        {provinces.map((province) => (
          <option key={province.code} value={province.code}>
            {province.name}
          </option>
        ))}
      </SelectField>

      {departmentsError || provincesErrorMessage ? (
        <p className="fieldError orgLocationFilterError" role="alert">
          {departmentsError ?? provincesErrorMessage}{" "}
          {departmentsError ? (
            <button
              className="linkButton"
              type="button"
              onClick={() => setDepartmentsReloadKey((current) => current + 1)}
            >
              Reintentar catálogo
            </button>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
