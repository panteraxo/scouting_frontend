import type { Metadata } from "next";
import { AdminOrganizationCreate } from "@/features/organizations/components/admin-organization-create";

export const metadata: Metadata = {
  title: "Nuevo club",
};

export default function AdminClubCreatePage() {
  return <AdminOrganizationCreate kind="club" />;
}
