import type { Metadata } from "next";
import { AdminUserList } from "@/features/usuarios/components/admin-user-list";

export const metadata: Metadata = {
  title: "Usuarios",
};

export default function AdminUsersPage() {
  return <AdminUserList />;
}
