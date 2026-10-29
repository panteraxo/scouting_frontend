import type { Metadata } from "next";
import { ScoutRegistrationsScreen } from "@/features/admin/components/scout-registrations-screen";

export const metadata: Metadata = {
  title: "Solicitudes de ojeador",
};

export default function ScoutRegistrationsPage() {
  return <ScoutRegistrationsScreen />;
}
