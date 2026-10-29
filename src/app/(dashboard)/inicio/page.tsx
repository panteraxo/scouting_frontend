import type { Metadata } from "next";
import { DashboardHome } from "@/features/auth/components/dashboard-home";

export const metadata: Metadata = {
  title: "Inicio",
};

export default function DashboardPage() {
  return <DashboardHome />;
}
