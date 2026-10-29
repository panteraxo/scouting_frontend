import type { Metadata } from "next";
import { AdminRecommendationDetailScreen } from "@/features/recomendaciones/components/admin-recommendation-detail-screen";

export const metadata: Metadata = {
  title: "Datos generales de recomendación",
};

export default function AdminRecommendationDetailPage() {
  return <AdminRecommendationDetailScreen />;
}
