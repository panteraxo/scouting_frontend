import type { Metadata } from "next";
import { AdminOrganizationDetail } from "@/features/organizations/components/admin-organization-detail";

export const metadata: Metadata = {
  title: "Detalle de club",
};

export default function AdminClubDetailPage() {
  return <AdminOrganizationDetail kind="club" />;
}
