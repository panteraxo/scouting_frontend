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

/** Esqueleto del dashboard mientras se verifica la sesión en rutas privadas. */
export function DashboardSkeleton() {
  return (
    <div
      className="dashboard dashboardSkeleton"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="srOnly">Verificando tu sesión…</span>

      <aside className="sidebar" aria-hidden="true">
        <span className="brand">
          <span className="brandMark">SP</span>
          <span>Scouting.pe</span>
        </span>

        <div className="skeletonNav">
          <span className="skeletonLine skeletonNavItem" />
          <span className="skeletonLine skeletonNavItem" />
          <span className="skeletonLine skeletonNavItem" />
          <span className="skeletonLine skeletonNavItem" />
          <span className="skeletonLine skeletonNavItem" />
        </div>
      </aside>

      <div className="dashboardMain" aria-hidden="true">
        <header className="topbar">
          <div className="skeletonStack">
            <span className="skeletonLine skeletonTitle" />
            <span className="skeletonLine skeletonMeta" />
          </div>
          <span className="skeletonLine skeletonBadge" />
        </header>

        <main className="dashboardContent">
          <div className="skeletonStack">
            <span className="skeletonLine skeletonHeading" />
            <span className="skeletonLine skeletonText" />
            <span className="skeletonLine skeletonTextShort" />
          </div>

          <div className="skeletonGrid">
            <div className="skeletonCard" />
            <div className="skeletonCard" />
            <div className="skeletonCard" />
          </div>
        </main>
      </div>
    </div>
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
