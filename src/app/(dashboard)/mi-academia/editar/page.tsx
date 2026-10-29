import type { Metadata } from "next";
import { OwnOrganizationEdit } from "@/features/organizations/components/own-organization-edit";

export const metadata: Metadata = {
  title: "Editar mi academia",
};

export default function OwnAcademyEditPage() {
  return <OwnOrganizationEdit kind="academy" />;
}
