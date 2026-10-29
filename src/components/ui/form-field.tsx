"use client";

import {
  useId,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

interface FieldExtras {
  label: string;
  hint?: string;
  error?: string;
}

type TextFieldProps = FieldExtras &
  Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & {
    className?: string;
  };

export function TextField({
  label,
  hint,
  error,
  id,
  name,
  className,
  ...props
}: TextFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? name ?? generatedId;
  const hintId = hint ? `${fieldId}-hint` : null;
  const errorId = error ? `${fieldId}-error` : null;
  const describedBy = [props["aria-describedby"], hintId, errorId]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="field">
      <label className="fieldLabel" htmlFor={fieldId}>
        {label}
      </label>
      <input
        {...props}
        id={fieldId}
        name={name}
        className={`input${className ? ` ${className}` : ""}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
      />
      {hint ? (
        <p className="fieldHint" id={hintId ?? undefined}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="fieldError" id={errorId ?? undefined}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

type TextAreaFieldProps = FieldExtras &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className"> & {
    className?: string;
  };

export function TextAreaField({
  label,
  hint,
  error,
  id,
  name,
  className,
  ...props
}: TextAreaFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? name ?? generatedId;
  const hintId = hint ? `${fieldId}-hint` : null;
  const errorId = error ? `${fieldId}-error` : null;
  const describedBy = [props["aria-describedby"], hintId, errorId]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="field">
      <label className="fieldLabel" htmlFor={fieldId}>
        {label}
      </label>
      <textarea
        {...props}
        id={fieldId}
        name={name}
        className={`input textarea${className ? ` ${className}` : ""}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
      />
      {hint ? (
        <p className="fieldHint" id={hintId ?? undefined}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="fieldError" id={errorId ?? undefined}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

type SelectFieldProps = FieldExtras &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, "className"> & {
    className?: string;
  };

export function SelectField({
  label,
  hint,
  error,
  id,
  name,
  className,
  children,
  ...props
}: SelectFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? name ?? generatedId;
  const hintId = hint ? `${fieldId}-hint` : null;
  const errorId = error ? `${fieldId}-error` : null;
  const describedBy = [props["aria-describedby"], hintId, errorId]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="field">
      <label className="fieldLabel" htmlFor={fieldId}>
        {label}
      </label>
      <select
        {...props}
        id={fieldId}
        name={name}
        className={`select${className ? ` ${className}` : ""}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
      >
        {children}
      </select>
      {hint ? (
        <p className="fieldHint" id={hintId ?? undefined}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="fieldError" id={errorId ?? undefined}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
