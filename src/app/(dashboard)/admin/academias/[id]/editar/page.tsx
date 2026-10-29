import type { Metadata } from "next";
import { AdminOrganizationEdit } from "@/features/organizations/components/admin-organization-edit";

export const metadata: Metadata = {
  title: "Editar academia",
};

export default function AdminAcademyEditPage() {
  return <AdminOrganizationEdit kind="academy" />;
}
