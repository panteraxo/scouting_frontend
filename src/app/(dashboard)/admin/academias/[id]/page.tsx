import type { Metadata } from "next";
import { AdminOrganizationDetail } from "@/features/organizations/components/admin-organization-detail";

export const metadata: Metadata = {
  title: "Detalle de academia",
};

export default function AdminAcademyDetailPage() {
  return <AdminOrganizationDetail kind="academy" />;
}
