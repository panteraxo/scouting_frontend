"use client";

import { useEffect, useState } from "react";
import { SelectField } from "@/components/ui/form-field";
import { useAuth } from "@/features/auth/auth-provider";
import { ApiError, isAbortError } from "@/lib/api-client";
import { listDepartments, listDistricts, listProvinces } from "@/features/organizations/organizations-api";
import type { UbigeoOption } from "@/types/api";

interface PlayerUbigeoValue {
  departmentCode: string;
  provinceCode: string;
  districtCode: string;
}

export function PlayerUbigeoFilter({
  value,
  includeDistrict,
  disabled,
  onChange,
}: {
  value: PlayerUbigeoValue;
  includeDistrict: boolean;
  disabled?: boolean;
  onChange: (next: PlayerUbigeoValue) => void;
}) {
  const { markSessionExpired } = useAuth();
  const [departments, setDepartments] = useState<UbigeoOption[]>([]);
  const [provincesData, setProvincesData] = useState<{
    code: string;
    items: UbigeoOption[];
  } | null>(null);
  const [districtsData, setDistrictsData] = useState<{
    code: string;
    items: UbigeoOption[];
  } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const provinces =
    provincesData?.code === value.departmentCode ? provincesData.items : [];
  const districts =
    districtsData?.code === value.provinceCode ? districtsData.items : [];

  useEffect(() => {
    const controller = new AbortController();
    let isActive = true;

    listDepartments(controller.signal)
      .then((data) => {
        if (isActive) {
          setDepartments(data);
          setLoadError(null);
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
        setLoadError(
          error instanceof Error
            ? error.message
            : "No se pudo cargar la lista de ubicaciones.",
        );
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [markSessionExpired]);

  useEffect(() => {
    if (!value.departmentCode) {
      return;
    }

    const controller = new AbortController();
    let isActive = true;

    listProvinces(value.departmentCode, controller.signal)
      .then((data) => {
        if (isActive) {
          setProvincesData({ code: value.departmentCode, items: data });
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
        setProvincesData({ code: value.departmentCode, items: [] });
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [value.departmentCode, markSessionExpired]);

  useEffect(() => {
    if (!value.provinceCode) {
      return;
    }

    const controller = new AbortController();
    let isActive = true;

    listDistricts(value.provinceCode, controller.signal)
      .then((data) => {
        if (isActive) {
          setDistrictsData({ code: value.provinceCode, items: data });
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
        setDistrictsData({ code: value.provinceCode, items: [] });
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [value.provinceCode, markSessionExpired]);

  return (
    <>
      <SelectField
        label="Departamento"
        name="regionCode"
        value={value.departmentCode}
        onChange={(event) =>
          onChange({
            departmentCode: event.target.value,
            provinceCode: "",
            districtCode: "",
          })
        }
        disabled={disabled}
        hint={
          loadError ??
          "Filtra por el distrito de residencia del jugador, no por el de la academia."
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
        label="Provincia"
        name="provinceCode"
        value={value.provinceCode}
        onChange={(event) =>
          onChange({
            departmentCode: value.departmentCode,
            provinceCode: event.target.value,
            districtCode: "",
          })
        }
        disabled={disabled || !value.departmentCode}
      >
        <option value="">
          {value.departmentCode
            ? "Todas las provincias"
            : "Primero selecciona un departamento"}
        </option>
        {provinces.map((province) => (
          <option key={province.code} value={province.code}>
            {province.name}
          </option>
        ))}
      </SelectField>

      {includeDistrict ? (
        <SelectField
          label="Distrito"
          name="districtCode"
          value={value.districtCode}
          onChange={(event) =>
            onChange({
              departmentCode: value.departmentCode,
              provinceCode: value.provinceCode,
              districtCode: event.target.value,
            })
          }
          disabled={disabled || !value.provinceCode}
          hint="El ojeador no dispone de filtro por distrito."
        >
          <option value="">
            {value.provinceCode
              ? "Todos los distritos"
              : "Primero selecciona una provincia"}
          </option>
          {districts.map((district) => (
            <option key={district.code} value={district.code}>
              {district.name}
            </option>
          ))}
        </SelectField>
      ) : null}
    </>
  );
}

export type { PlayerUbigeoValue };
