import type { Metadata } from "next";
import { AdminOrganizationList } from "@/features/organizations/components/admin-organization-list";

export const metadata: Metadata = {
  title: "Academias",
};

export default function AdminAcademiesPage() {
  return <AdminOrganizationList kind="academy" />;
}
