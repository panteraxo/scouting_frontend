"use client";

import Link from "next/link";
import { useAuth } from "../auth-provider";
import { fullName, roleLabel, statusLabel } from "../user-labels";

export function DashboardHome() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  const isAdmin = user.role === "ADMIN";
  const isAcademyRole =
    user.role === "PROFESSOR" || user.role === "ACADEMY_DIRECTOR";

  return (
    <div>
      <header className="pageHeader">
        <div>
          <p className="eyebrow">SCOUTING.PE</p>
          <h1>Hola, {user.firstName}</h1>
          <p>
            Este es el punto de partida del dashboard. Tu rol y tus permisos se
            verifican automáticamente en cada consulta.
          </p>
        </div>
      </header>

      <div className="cardGrid">
        <section className="card" aria-labelledby="account-title">
          <h2 id="account-title">Tu cuenta</h2>
          <dl className="metaList">
            <div>
              <dt>Nombre</dt>
              <dd>{fullName(user)}</dd>
            </div>
            <div>
              <dt>Correo</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt>Usuario</dt>
              <dd>@{user.username}</dd>
            </div>
            <div>
              <dt>Rol</dt>
              <dd>{roleLabel(user.role)}</dd>
            </div>
            <div>
              <dt>Estado</dt>
              <dd>
                <span className="statusBadge statusActive">
                  {statusLabel(user.status)}
                </span>
              </dd>
            </div>
          </dl>
        </section>

        {isAdmin ? (
          <>
            <section className="card" aria-labelledby="admin-academies-title">
              <h2 id="admin-academies-title">Academias</h2>
              <p>
                Crea y administra academias, revisa su estado operativo y su
                verificación.
              </p>
              <Link
                className="button buttonPrimary cardAction"
                href="/admin/academias"
              >
                Gestionar academias
              </Link>
            </section>

            <section className="card" aria-labelledby="admin-clubs-title">
              <h2 id="admin-clubs-title">Clubes</h2>
              <p>
                Crea y administra clubes. La verificación y la reactivación son
                exclusivas del Administrador.
              </p>
              <Link
                className="button buttonPrimary cardAction"
                href="/admin/clubes"
              >
                Gestionar clubes
              </Link>
            </section>

            <section className="card" aria-labelledby="admin-title">
              <h2 id="admin-title">Usuarios</h2>
              <p>
                Crea cuentas de administración, academia, club u ojeador, asigna
                una academia o club cuando corresponda y administra el estado de
                acceso. Las cuentas de jugador se crean desde Jugadores.
              </p>
              <Link
                className="button buttonPrimary cardAction"
                href="/admin/usuarios"
              >
                Gestionar usuarios
              </Link>
            </section>

            <section className="card" aria-labelledby="admin-players-title">
              <h2 id="admin-players-title">Jugadores</h2>
              <p>
                Consulta perfiles de todas las academias, crea cuentas de jugador
                con su perfil deportivo y administra su estado e historial.
              </p>
              <div className="rowActions cardAction">
                <Link
                  className="button buttonPrimary buttonSmall"
                  href="/jugadores"
                >
                  Ver jugadores
                </Link>
                <Link
                  className="button buttonSecondary buttonSmall"
                  href="/jugadores/nuevo"
                >
                  Nuevo jugador
                </Link>
              </div>
            </section>

            <section className="card" aria-labelledby="admin-scouts-title">
              <h2 id="admin-scouts-title">Revisión de ojeadores</h2>
              <p>
                Consulta las solicitudes de registro público y apruébalas o
                recházalas. Solo las cuentas aprobadas pueden iniciar sesión.
              </p>
              <Link
                className="button buttonSecondary cardAction"
                href="/admin/solicitudes-ojeador"
              >
                Revisar solicitudes
              </Link>
            </section>

            <section className="card" aria-labelledby="admin-recommendations-title">
              <h2 id="admin-recommendations-title">Recomendaciones</h2>
              <p>
                Consulta únicamente datos generales de auditoría: estado,
                jugador, ojeador, club y fechas. Sin carta, resumen compartido
                ni notas privadas.
              </p>
              <Link
                className="button buttonSecondary cardAction"
                href="/admin/recomendaciones"
              >
                Ver auditoría
              </Link>
            </section>
          </>
        ) : null}

        {isAcademyRole ? (
          <>
            <section className="card" aria-labelledby="academy-title">
              <h2 id="academy-title">Mi academia</h2>
              <p>
                {user.role === "ACADEMY_DIRECTOR"
                  ? "Consulta, actualiza o inhabilita la academia asignada a tu cuenta. La creación y la verificación corresponden al Administrador."
                  : "Consulta la academia asignada a tu cuenta. Tu rol tiene acceso de solo lectura."}
              </p>
              <Link
                className="button buttonPrimary cardAction"
                href="/mi-academia"
              >
                Ver mi academia
              </Link>
            </section>

            {user.role === "ACADEMY_DIRECTOR" ? (
              <section className="card" aria-labelledby="create-users-title">
                <h2 id="create-users-title">Crear usuarios</h2>
                <p>
                  Crea cuentas de Profesor dentro de tu academia. La contraseña
                  temporal se muestra una sola vez.
                </p>
                <Link
                  className="button buttonSecondary cardAction"
                  href="/usuarios/nuevo"
                >
                  Crear usuario
                </Link>
              </section>
            ) : (
              <section className="card" aria-labelledby="create-player-title">
                <h2 id="create-player-title">Nuevo jugador</h2>
                <p>
                  Registra a un jugador de tu academia: se crean su cuenta y su
                  perfil deportivo en una sola operación. La contraseña temporal
                  se muestra una sola vez.
                </p>
                <Link
                  className="button buttonSecondary cardAction"
                  href="/jugadores/nuevo"
                >
                  Nuevo jugador
                </Link>
              </section>
            )}

            <section className="card" aria-labelledby="academy-players-title">
              <h2 id="academy-players-title">Jugadores</h2>
              <p>
                Consulta los perfiles de tu academia, registra nuevos jugadores y
                administra su historial y tutor cuando corresponda.
              </p>
              <div className="rowActions cardAction">
                <Link
                  className="button buttonPrimary buttonSmall"
                  href="/jugadores"
                >
                  Ver jugadores
                </Link>
                <Link
                  className="button buttonSecondary buttonSmall"
                  href="/jugadores/nuevo"
                >
                  Nuevo jugador
                </Link>
              </div>
            </section>
          </>
        ) : null}

        {user.role === "CLUB_MANAGER" ? (
          <section className="card" aria-labelledby="club-title">
            <h2 id="club-title">Mi club</h2>
            <p>
              Consulta, actualiza o inhabilita el club asignado a tu cuenta. La
              creación, verificación y reactivación corresponden al
              Administrador.
            </p>
            <div className="rowActions cardAction">
              <Link className="button buttonPrimary buttonSmall" href="/mi-club">
                Ver mi club
              </Link>
              <Link
                className="button buttonSecondary buttonSmall"
                href="/mi-club/recomendaciones"
              >
                Recomendaciones
              </Link>
            </div>
          </section>
        ) : null}

        {user.role === "SCOUT" ? (
          <>
            <section className="card" aria-labelledby="scout-players-title">
              <h2 id="scout-players-title">Jugadores</h2>
              <p>
                Consulta perfiles activos y completos de academias operativas.
                La ficha indica el estado de verificación de la academia.
              </p>
              <Link
                className="button buttonPrimary cardAction"
                href="/jugadores"
              >
                Explorar jugadores
              </Link>
            </section>

            <section className="card" aria-labelledby="scout-prospects-title">
              <h2 id="scout-prospects-title">Prospecciones</h2>
              <p>
                Consulta tus seguimientos privados, notas y evaluaciones. Solo tú
                puedes acceder a este contenido.
              </p>
              <Link
                className="button buttonPrimary cardAction"
                href="/prospecciones"
              >
                Ver prospecciones
              </Link>
            </section>

            <section className="card" aria-labelledby="scout-academies-title">
              <h2 id="scout-academies-title">Academias</h2>
              <p>
                Consulta academias activas y verificadas. La información es
                institucional y de solo lectura.
              </p>
              <Link
                className="button buttonPrimary cardAction"
                href="/academias"
              >
                Explorar academias
              </Link>
            </section>

            <section className="card" aria-labelledby="scout-clubs-title">
              <h2 id="scout-clubs-title">Clubes</h2>
              <p>
                Consulta clubes activos y verificados. No se muestran datos
                personales de representantes.
              </p>
              <Link
                className="button buttonPrimary cardAction"
                href="/clubes"
              >
                Explorar clubes
              </Link>
            </section>
          </>
        ) : null}

        {user.role === "PLAYER" ? (
          <section className="card" aria-labelledby="player-title">
            <h2 id="player-title">Mi perfil deportivo</h2>
            <p>
              Consulta tu perfil, estadísticas y trayectoria en modo de solo
              lectura. No puedes editar tu perfil ni acceder a datos del tutor.
            </p>
            <Link className="button buttonPrimary cardAction" href="/mi-perfil">
              Ver mi perfil
            </Link>
          </section>
        ) : null}

        <section className="card" aria-labelledby="security-title">
          <h2 id="security-title">Seguridad</h2>
          <p>
            Puedes actualizar tu contraseña en cualquier momento. Tu sesión está
            protegida y no se guardan credenciales en el navegador.
          </p>
          <Link
            className="button buttonSecondary cardAction"
            href="/cambiar-password"
          >
            Cambiar contraseña
          </Link>
        </section>
      </div>

      <p className="footnote">
        Los módulos y acciones visibles dependen de tu rol; tus permisos se
        verifican automáticamente en cada operación. La interfaz no muestra datos
        simulados.
      </p>
    </div>
  );
}
