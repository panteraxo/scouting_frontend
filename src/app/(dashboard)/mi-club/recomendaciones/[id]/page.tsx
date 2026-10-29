import type { Metadata } from "next";
import { ClubRecommendationDetailScreen } from "@/features/recomendaciones/components/club-recommendation-detail-screen";

export const metadata: Metadata = {
  title: "Recomendación del club",
};

export default function ClubRecommendationDetailPage() {
  return <ClubRecommendationDetailScreen />;
}
