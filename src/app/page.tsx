import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page">
      <section className="welcome">
        <p className="eyebrow">SCOUTING.PE</p>
        <h1>Plataforma de scouting de fútbol</h1>
        <p className="welcomeLead">
          Sistema web para descubrir, evaluar y dar seguimiento al talento
          futbolístico del Perú, con acceso según el rol de cada integrante.
        </p>

        <div className="welcomeActions">
          <Link className="button buttonPrimary" href="/inicio">
            Ir al dashboard
          </Link>
          <Link className="button buttonSecondary" href="/login">
            Iniciar sesión
          </Link>
          <Link className="button buttonGhost" href="/registro/ojeador">
            Registro de ojeador
          </Link>
        </div>

        <ul className="welcomeList">
          <li>Acceso según el rol de cada usuario.</li>
          <li>Sesión protegida y acceso seguro.</li>
          <li>Registro de ojeadores con aprobación de un administrador.</li>
        </ul>

        <p className="welcomeNote">
          Si aún no tienes una sesión activa, el dashboard te pedirá iniciar
          sesión.
        </p>
      </section>
    </main>
  );
}
