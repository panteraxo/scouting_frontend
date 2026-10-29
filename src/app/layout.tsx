import type { Metadata } from "next";
import { AuthProvider } from "@/features/auth/auth-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Scouting.pe",
    template: "%s | Scouting.pe",
  },
  description:
    "Sistema web para la búsqueda, evaluación y seguimiento de jugadores de fútbol.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
