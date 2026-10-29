import type { Metadata } from "next";
import { AdminOrganizationList } from "@/features/organizations/components/admin-organization-list";

export const metadata: Metadata = {
  title: "Clubes",
};

export default function AdminClubsPage() {
  return <AdminOrganizationList kind="club" />;
}
