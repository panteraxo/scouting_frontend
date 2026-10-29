"use client";

import { useEffect, useState } from "react";
import { SelectField } from "@/components/ui/form-field";
import { useAuth } from "@/features/auth/auth-provider";
import { ApiError, isAbortError } from "@/lib/api-client";
import type { UbigeoOption } from "@/types/api";
import {
  listDepartments,
  listDistricts,
  listProvinces,
} from "../organizations-api";

interface UbigeoFieldsProps {
  ubigeoCode: string;
  disabled?: boolean;
  error?: string;
  onChange: (ubigeoCode: string) => void;
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "No se pudo cargar la lista de ubicaciones.";
}

export function UbigeoFields({
  ubigeoCode,
  disabled = false,
  error,
  onChange,
}: UbigeoFieldsProps) {
  const { markSessionExpired } = useAuth();
  const [departmentCode, setDepartmentCode] = useState(() =>
    ubigeoCode.slice(0, 2),
  );
  const [provinceCode, setProvinceCode] = useState(() =>
    ubigeoCode.slice(0, 4),
  );
  const [districtCode, setDistrictCode] = useState(() =>
    ubigeoCode.slice(0, 6),
  );
  const [departments, setDepartments] = useState<UbigeoOption[]>([]);
  const [provincesData, setProvincesData] = useState<{
    code: string;
    items: UbigeoOption[];
  } | null>(null);
  const [districtsData, setDistrictsData] = useState<{
    code: string;
    items: UbigeoOption[];
  } | null>(null);
  const [departmentsError, setDepartmentsError] = useState<string | null>(null);
  const [provincesError, setProvincesError] = useState<{
    code: string;
    message: string;
  } | null>(null);
  const [districtsError, setDistrictsError] = useState<{
    code: string;
    message: string;
  } | null>(null);
  const [departmentsReloadKey, setDepartmentsReloadKey] = useState(0);

  const provinces =
    provincesData?.code === departmentCode ? provincesData.items : [];
  const districts =
    districtsData?.code === provinceCode ? districtsData.items : [];
  const provincesErrorMessage =
    provincesError?.code === departmentCode ? provincesError.message : null;
  const districtsErrorMessage =
    districtsError?.code === provinceCode ? districtsError.message : null;

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

  useEffect(() => {
    if (!provinceCode) {
      return;
    }

    const controller = new AbortController();
    let isActive = true;

    listDistricts(provinceCode, controller.signal)
      .then((data) => {
        if (isActive) {
          setDistrictsData({ code: provinceCode, items: data });
          setDistrictsError(null);
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

        setDistrictsData({ code: provinceCode, items: [] });
        setDistrictsError({
          code: provinceCode,
          message: errorMessage(error),
        });
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [provinceCode, markSessionExpired]);

  return (
    <>
      <div className="fieldFull">
        <div className="formGrid">
          <SelectField
            label="Departamento"
            name="departmentCode"
            value={departmentCode}
            onChange={(event) => {
              const code = event.target.value;
              setDepartmentCode(code);
              setProvinceCode("");
              setDistrictCode("");
              onChange("");
            }}
            disabled={disabled}
            hint="Selecciona departamento, provincia y distrito."
          >
            <option value="">Selecciona un departamento</option>
            {departments.map((department) => (
              <option key={department.code} value={department.code}>
                {department.name}
              </option>
            ))}
          </SelectField>

          <SelectField
            label="Provincia"
            name="provinceCode"
            value={provinceCode}
            onChange={(event) => {
              const code = event.target.value;
              setProvinceCode(code);
              setDistrictCode("");
              onChange("");
            }}
            disabled={disabled || !departmentCode}
          >
            <option value="">
              {departmentCode
                ? "Selecciona una provincia"
                : "Primero selecciona un departamento"}
            </option>
            {provinces.map((province) => (
              <option key={province.code} value={province.code}>
                {province.name}
              </option>
            ))}
          </SelectField>
        </div>

        {departmentsError || provincesErrorMessage ? (
          <p className="fieldError" role="alert">
            {departmentsError ?? provincesErrorMessage}{" "}
            {departmentsError ? (
              <button
                className="linkButton"
                type="button"
                onClick={() =>
                  setDepartmentsReloadKey((current) => current + 1)
                }
              >
                Reintentar catálogo
              </button>
            ) : null}
          </p>
        ) : null}
      </div>

      <div className="fieldFull">
        <div className="formGrid">
          <SelectField
            label="Distrito"
            id="ubigeoCode"
            name="ubigeoCode"
            value={districtCode}
            onChange={(event) => {
              const code = event.target.value;
              setDistrictCode(code);
              onChange(code);
            }}
            disabled={disabled || !provinceCode}
            error={error}
          >
            <option value="">
              {provinceCode
                ? "Selecciona un distrito"
                : "Primero selecciona una provincia"}
            </option>
            {districts.map((district) => (
              <option key={district.code} value={district.code}>
                {district.name}
              </option>
            ))}
          </SelectField>

          <div className="field">
            <label className="fieldLabel" htmlFor="country">
              País
            </label>
            <input
              className="input"
              id="country"
              value="Perú"
              readOnly
              disabled
              aria-describedby="country-hint"
            />
            <p className="fieldHint" id="country-hint">
              El país es Perú; la ubicación se selecciona por departamento,
              provincia y distrito.
            </p>
          </div>
        </div>

        {districtsErrorMessage ? (
          <p className="fieldError" role="alert">
            {districtsErrorMessage}
          </p>
        ) : null}
      </div>
    </>
  );
}
