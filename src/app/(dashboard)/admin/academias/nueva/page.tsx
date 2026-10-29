import type { Metadata } from "next";
import { AdminOrganizationCreate } from "@/features/organizations/components/admin-organization-create";

export const metadata: Metadata = {
  title: "Nueva academia",
};

export default function AdminAcademyCreatePage() {
  return <AdminOrganizationCreate kind="academy" />;
}
