import type { Metadata } from "next";
import { OrganizationDirectory } from "@/features/organizations/components/organization-directory";

export const metadata: Metadata = {
  title: "Academias",
};

export default function AcademyDirectoryPage() {
  return <OrganizationDirectory kind="academy" />;
}
