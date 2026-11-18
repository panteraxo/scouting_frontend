"use client";

import Link from "next/link";
import type { UserRole } from "@/types/api";
import { useAuth } from "../auth-provider";
import { HomeKpis } from "./home-kpis";

interface ModuleLink {
  href: string;
  title: string;
  description: string;
}

interface ModuleGroup {
  title: string;
  links: ModuleLink[];
}

const ROLE_INTROS: Record<UserRole, string> = {
  ADMIN:
    "Revisa solicitudes, verifica organizaciones y mantén las cuentas al día.",
  SCOUT:
    "Consulta jugadores, registra tus evaluaciones y comparte candidatos con clubes.",
  PROFESSOR:
    "Gestiona los jugadores de tu academia y mantén sus perfiles al día.",
  ACADEMY_DIRECTOR:
    "Administra tu academia, su plantel y las cuentas de tu equipo.",
  CLUB_MANAGER: "Revisa las recomendaciones que llegan a tu club y responde.",
  PLAYER: "Consulta tu perfil deportivo y tu historial.",
};

const MODULE_GROUPS: Record<UserRole, ModuleGroup[]> = {
  ADMIN: [
    {
      title: "Cuentas y organizaciones",
      links: [
        {
          href: "/admin/usuarios",
          title: "Usuarios",
          description: "Crea cuentas y define quién puede entrar.",
        },
        {
          href: "/admin/academias",
          title: "Academias",
          description: "Consulta, crea y verifica academias.",
        },
        {
          href: "/admin/clubes",
          title: "Clubes",
          description: "Consulta, crea y verifica clubes.",
        },
        {
          href: "/admin/solicitudes-ojeador",
          title: "Solicitudes de ojeador",
          description: "Aprueba o rechaza los pedidos de registro.",
        },
      ],
    },
    {
      title: "Seguimiento",
      links: [
        {
          href: "/jugadores",
          title: "Jugadores",
          description: "Perfiles de todas las academias y su historial.",
        },
        {
          href: "/jugadores/nuevo",
          title: "Nuevo jugador",
          description: "Crea la cuenta y el perfil deportivo de un jugador.",
        },
        {
          href: "/admin/recomendaciones",
          title: "Recomendaciones",
          description: "Consulta el estado de cada recomendación enviada.",
        },
      ],
    },
  ],
  SCOUT: [
    {
      title: "Tu trabajo",
      links: [
        {
          href: "/prospecciones",
          title: "Prospección",
          description: "Tus seguimientos, notas y evaluaciones privadas.",
        },
        {
          href: "/jugadores",
          title: "Jugadores",
          description: "Explora perfiles activos de academias operativas.",
        },
      ],
    },
    {
      title: "Directorio",
      links: [
        {
          href: "/academias",
          title: "Academias",
          description: "Academias activas y verificadas.",
        },
        {
          href: "/clubes",
          title: "Clubes",
          description: "Clubes activos y verificados.",
        },
      ],
    },
  ],
  PROFESSOR: [
    {
      title: "Tu academia",
      links: [
        {
          href: "/mi-academia",
          title: "Mi academia",
          description: "Datos de la academia asignada a tu cuenta.",
        },
        {
          href: "/jugadores",
          title: "Jugadores",
          description: "Perfiles de tu academia, con historial y tutor.",
        },
        {
          href: "/jugadores/nuevo",
          title: "Nuevo jugador",
          description: "Crea la cuenta y el perfil deportivo de un jugador.",
        },
      ],
    },
  ],
  ACADEMY_DIRECTOR: [
    {
      title: "Tu academia",
      links: [
        {
          href: "/mi-academia",
          title: "Mi academia",
          description: "Actualiza los datos de la academia asignada.",
        },
        {
          href: "/jugadores",
          title: "Jugadores",
          description: "Perfiles de tu academia, con historial y tutor.",
        },
        {
          href: "/usuarios/nuevo",
          title: "Crear usuario",
          description: "Abre una cuenta de profesor para tu academia.",
        },
        {
          href: "/jugadores/nuevo",
          title: "Nuevo jugador",
          description: "Crea la cuenta y el perfil deportivo de un jugador.",
        },
      ],
    },
  ],
  CLUB_MANAGER: [
    {
      title: "Tu club",
      links: [
        {
          href: "/mi-club",
          title: "Mi club",
          description: "Actualiza los datos del club asignado.",
        },
        {
          href: "/mi-club/recomendaciones",
          title: "Recomendaciones del club",
          description: "Responde las recomendaciones que llegan a tu club.",
        },
      ],
    },
  ],
  PLAYER: [
    {
      title: "Tu perfil",
      links: [
        {
          href: "/mi-perfil",
          title: "Mi perfil",
          description: "Tu perfil deportivo, estadísticas y trayectoria.",
        },
      ],
    },
  ],
};

export function DashboardHome() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  const groups = MODULE_GROUPS[user.role];

  return (
    <div className="dashboardHome">
      <header className="pageHeader">
        <div>
          <h1>Hola, {user.firstName}</h1>
          <p>{ROLE_INTROS[user.role]}</p>
        </div>
      </header>

      <HomeKpis />

      <section className="moduleGroups" aria-labelledby="modules-title">
        <h2 className="sectionTitle" id="modules-title">
          Módulos
        </h2>

        {groups.map((group) => (
          <div className="moduleGroup" key={group.title}>
            <h3 className="moduleGroupTitle">{group.title}</h3>
            <ul className="moduleList">
              {group.links.map((link) => (
                <li className="moduleItem" key={link.href}>
                  <Link href={link.href}>
                    <span className="moduleItemTitle">{link.title}</span>
                    <p>{link.description}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}
