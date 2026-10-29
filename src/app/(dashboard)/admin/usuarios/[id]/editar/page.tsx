import type { Metadata } from "next";
import { AdminUserEdit } from "@/features/usuarios/components/admin-user-edit";

export const metadata: Metadata = {
  title: "Editar usuario",
};

export default function AdminUserEditPage() {
  return <AdminUserEdit />;
}
