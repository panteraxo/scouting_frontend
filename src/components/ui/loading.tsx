import type { ReactNode } from "react";

export function Spinner({ large = false }: { large?: boolean }) {
  return (
    <span
      className={`spinner${large ? " spinnerLarge" : ""}`}
      aria-hidden="true"
    />
  );
}

export function LoadingScreen({
  message = "Cargando…",
  detail,
}: {
  message?: string;
  detail?: string;
}) {
  return (
    <main className="loadingScreen">
      <div className="loadingCard" role="status" aria-live="polite">
        <span className="brand">
          <span className="brandMark">SP</span>
          <span>Scouting.pe</span>
        </span>
        <Spinner large />
        <p className="loadingMessage">{message}</p>
        {detail ? <p className="loadingDetail">{detail}</p> : null}
      </div>
    </main>
  );
}

export function InlineLoading({ message }: { message: string }) {
  return (
    <div className="inlineLoading" role="status" aria-live="polite">
      <Spinner />
      <span>{message}</span>
    </div>
  );
}

export function StatePanel({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="statePanel">
      <h2>{title}</h2>
      {children ? <div className="statePanelBody">{children}</div> : null}
      {action ? <div className="statePanelAction">{action}</div> : null}
    </div>
  );
}
