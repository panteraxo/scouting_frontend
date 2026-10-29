import type { Metadata } from "next";
import { AdminOrganizationEdit } from "@/features/organizations/components/admin-organization-edit";

export const metadata: Metadata = {
  title: "Editar club",
};

export default function AdminClubEditPage() {
  return <AdminOrganizationEdit kind="club" />;
}
