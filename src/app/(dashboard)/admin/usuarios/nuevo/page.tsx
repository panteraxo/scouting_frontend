import type { Metadata } from "next";
import { AdminUserCreate } from "@/features/usuarios/components/admin-user-create";

export const metadata: Metadata = {
  title: "Nuevo usuario",
};

export default function AdminUserCreatePage() {
  return <AdminUserCreate />;
}
