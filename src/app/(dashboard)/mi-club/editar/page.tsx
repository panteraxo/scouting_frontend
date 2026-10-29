import type { Metadata } from "next";
import { OwnOrganizationEdit } from "@/features/organizations/components/own-organization-edit";

export const metadata: Metadata = {
  title: "Editar mi club",
};

export default function OwnClubEditPage() {
  return <OwnOrganizationEdit kind="club" />;
}
