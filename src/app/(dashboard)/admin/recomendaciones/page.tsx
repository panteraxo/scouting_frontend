import type { Metadata } from "next";
import { AdminRecommendationListScreen } from "@/features/recomendaciones/components/admin-recommendation-list-screen";

export const metadata: Metadata = {
  title: "Auditoría de recomendaciones",
};

export default function AdminRecommendationsPage() {
  return <AdminRecommendationListScreen />;
}
