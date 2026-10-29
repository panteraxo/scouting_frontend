import type { Metadata } from "next";
import { OrganizationDirectoryDetail } from "@/features/organizations/components/organization-directory-detail";

export const metadata: Metadata = {
  title: "Detalle de club",
};

export default function ClubDirectoryDetailPage() {
  return <OrganizationDirectoryDetail kind="club" />;
}
