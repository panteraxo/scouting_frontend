import type { Metadata } from "next";
import { ScopedUserCreate } from "@/features/usuarios/components/scoped-user-create";

export const metadata: Metadata = {
  title: "Crear usuario",
};

export default function ScopedUserCreatePage() {
  return <ScopedUserCreate />;
}
