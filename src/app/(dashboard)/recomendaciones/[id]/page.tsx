import type { Metadata } from "next";
import { ScoutRecommendationDetailScreen } from "@/features/recomendaciones/components/scout-recommendation-detail-screen";

export const metadata: Metadata = {
  title: "Recomendación",
};

export default function ScoutRecommendationPage() {
  return <ScoutRecommendationDetailScreen />;
}
