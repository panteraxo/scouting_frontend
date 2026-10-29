import type { ReactNode } from "react";

export type AlertVariant = "error" | "success" | "info" | "warning";

const VARIANT_CLASS: Record<AlertVariant, string> = {
  error: "alertError",
  success: "alertSuccess",
  info: "alertInfo",
  warning: "alertWarning",
};

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: ReactNode;
}

export function Alert({ variant = "info", title, children }: AlertProps) {
  return (
    <div
      className={`alert ${VARIANT_CLASS[variant]}`}
      role={variant === "error" ? "alert" : "status"}
    >
      {title ? <p className="alertTitle">{title}</p> : null}
      <div className="alertContent">{children}</div>
    </div>
  );
}
