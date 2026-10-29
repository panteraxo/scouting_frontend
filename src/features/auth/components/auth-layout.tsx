import Link from "next/link";
import type { ReactNode } from "react";

interface AuthLayoutProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthLayout({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: AuthLayoutProps) {
  return (
    <main className="authPage">
      <div className="authCard">
        <aside className="authAside">
          <Link className="brand" href="/">
            <span className="brandMark">SP</span>
            <span>Scouting.pe</span>
          </Link>

          <div>
            <p className="asideEyebrow">Plataforma de scouting</p>
            <h2>Talento peruano, decisiones con evidencia.</h2>
            <p>
              Centraliza la evaluación y el seguimiento de jugadores con acceso
              según el rol de cada integrante.
            </p>
            <ul className="authAsideList">
              <li>Cuentas con roles y permisos propios de cada perfil.</li>
              <li>Sesión protegida y acceso seguro.</li>
              <li>Las solicitudes de ojeador requieren aprobación.</li>
            </ul>
          </div>

          <p className="authAsideNote">
            Scouting.pe · Búsqueda y seguimiento de talento futbolístico
          </p>
        </aside>

        <section className="authMain">
          <p className="eyebrow">{eyebrow}</p>
          <header className="authHeader">
            <h1>{title}</h1>
            {subtitle ? <p>{subtitle}</p> : null}
          </header>

          {children}

          {footer ? <footer className="authFooter">{footer}</footer> : null}
        </section>
      </div>
    </main>
  );
}
