import type { Metadata } from "next";
import { OrganizationDirectory } from "@/features/organizations/components/organization-directory";

export const metadata: Metadata = {
  title: "Clubes",
};

export default function ClubDirectoryPage() {
  return <OrganizationDirectory kind="club" />;
}
