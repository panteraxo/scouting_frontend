"use client";

/** Barra de progreso accesible compartida por los campos de subida. */
export function UploadProgress({
  percent,
  label,
}: {
  percent: number;
  label: string;
}) {
  const value = Math.max(0, Math.min(100, Math.round(percent)));

  return (
    <div className="mediaProgressGroup">
      <div
        className="mediaProgress"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
      >
        <span style={{ width: `${value}%` }} />
      </div>
      <p className="mediaStatus" aria-live="polite">
        {label} {value}%
      </p>
    </div>
  );
}
