import type { Metadata } from "next";
import { OwnOrganization } from "@/features/organizations/components/own-organization";

export const metadata: Metadata = {
  title: "Mi club",
};

export default function OwnClubPage() {
  return <OwnOrganization kind="club" />;
}
