"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Spinner } from "@/components/ui/loading";
import type { UserRole } from "@/types/api";
import { useAuth } from "../auth-provider";
import { fullName, initials, roleLabel } from "../user-labels";

interface NavItem {
  href: string;
  label: string;
  roles: UserRole[];
  /** Ruta alternativa cuando el rol necesita un módulo distinto. */
  hrefByRole?: Partial<Record<UserRole, string>>;
}

const ALL_ROLES: UserRole[] = [
  "ADMIN",
  "PROFESSOR",
  "ACADEMY_DIRECTOR",
  "SCOUT",
  "CLUB_MANAGER",
  "PLAYER",
];

const NAV_ITEMS: NavItem[] = [
  { href: "/inicio", label: "Inicio", roles: ALL_ROLES },
  { href: "/admin/usuarios", label: "Usuarios", roles: ["ADMIN"] },
  {
    href: "/admin/academias",
    label: "Academias",
    roles: ["ADMIN", "SCOUT"],
    hrefByRole: { SCOUT: "/academias" },
  },
  {
    href: "/admin/clubes",
    label: "Clubes",
    roles: ["ADMIN", "SCOUT"],
    hrefByRole: { SCOUT: "/clubes" },
  },
  {
    href: "/prospecciones",
    label: "Prospección",
    roles: ["SCOUT"],
  },
  {
    href: "/jugadores",
    label: "Jugadores",
    roles: ["ADMIN", "ACADEMY_DIRECTOR", "PROFESSOR", "SCOUT"],
  },
  {
    href: "/admin/recomendaciones",
    label: "Recomendaciones",
    roles: ["ADMIN"],
  },
  {
    href: "/admin/solicitudes-ojeador",
    label: "Solicitudes de ojeador",
    roles: ["ADMIN"],
  },
  {
    href: "/usuarios/nuevo",
    label: "Crear usuario",
    roles: ["ACADEMY_DIRECTOR"],
  },
  {
    href: "/mi-academia",
    label: "Mi academia",
    roles: ["ACADEMY_DIRECTOR", "PROFESSOR"],
  },
  { href: "/mi-club", label: "Mi club", roles: ["CLUB_MANAGER"] },
  {
    href: "/mi-club/recomendaciones",
    label: "Recomendaciones del club",
    roles: ["CLUB_MANAGER"],
  },
  { href: "/mi-perfil", label: "Mi perfil", roles: ["PLAYER"] },
];

function resolveNavHref(item: NavItem, role: UserRole): string {
  return item.hrefByRole?.[role] ?? item.href;
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (!user) {
    return null;
  }

  const visibleItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(user.role),
  );
  const activeItem = [...visibleItems]
    .sort(
      (first, second) =>
        resolveNavHref(second, user.role).length -
        resolveNavHref(first, user.role).length,
    )
    .find((item) => {
      const href = resolveNavHref(item, user.role);
      return pathname === href || pathname.startsWith(`${href}/`);
    });

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await logout();
      router.replace("/login");
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <div className="dashboard">
      <a className="skipLink" href="#contenido">
        Saltar al contenido
      </a>

      <aside className="sidebar">
        <Link className="brand" href="/inicio">
          <span className="brandMark">SP</span>
          <span>Scouting.pe</span>
        </Link>

        <nav className="sidebarNav" aria-label="Módulos del dashboard">
          <p className="navSectionLabel">Panel</p>
          {visibleItems.map((item) => {
            const href = resolveNavHref(item, user.role);
            const isActive = activeItem === item;

            return (
              <Link
                key={href}
                className={`navLink${isActive ? " navLinkActive" : ""}`}
                href={href}
                aria-current={isActive ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="sidebarFooter">
          <div className="userSummary">
            <span className="avatar" aria-hidden="true">
              {initials(user)}
            </span>
            <span className="userSummaryText">
              <span className="userSummaryName">{fullName(user)}</span>
              <span className="userSummaryMeta">{roleLabel(user.role)}</span>
            </span>
          </div>
          <button
            className="button buttonSmall logoutButton"
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? <Spinner /> : null}
            {isLoggingOut ? "Cerrando sesión…" : "Cerrar sesión"}
          </button>
        </div>
      </aside>

      <div className="dashboardMain">
        <header className="topbar">
          <div>
            <p className="topbarTitle">
              {activeItem?.label ?? "Panel de scouting"}
            </p>
            <p className="topbarUser">{user.email}</p>
          </div>
          <span className="topbarBadge">{roleLabel(user.role)}</span>
        </header>

        <main className="dashboardContent" id="contenido">
          {children}
        </main>
      </div>
    </div>
  );
}
