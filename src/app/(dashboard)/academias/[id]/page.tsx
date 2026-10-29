import type { Metadata } from "next";
import { OrganizationDirectoryDetail } from "@/features/organizations/components/organization-directory-detail";

export const metadata: Metadata = {
  title: "Detalle de academia",
};

export default function AcademyDirectoryDetailPage() {
  return <OrganizationDirectoryDetail kind="academy" />;
}
