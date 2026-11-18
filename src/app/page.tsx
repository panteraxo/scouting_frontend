import { redirect } from "next/navigation";

/**
 * La raíz del sitio abre el inicio del dashboard. Si no hay sesión activa, el
 * layout del dashboard redirige al login.
 */
export default function HomePage() {
  redirect("/inicio");
}
