import type { Metadata } from "next";
import { OwnOrganization } from "@/features/organizations/components/own-organization";

export const metadata: Metadata = {
  title: "Mi academia",
};

export default function OwnAcademyPage() {
  return <OwnOrganization kind="academy" />;
}
