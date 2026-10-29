import type { Metadata } from "next";
import { AdminUserDetail } from "@/features/usuarios/components/admin-user-detail";

export const metadata: Metadata = {
  title: "Detalle de usuario",
};

export default function AdminUserDetailPage() {
  return <AdminUserDetail />;
}
