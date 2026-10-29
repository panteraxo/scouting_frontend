import type { Metadata } from "next";
import { ClubRecommendationListScreen } from "@/features/recomendaciones/components/club-recommendation-list-screen";

export const metadata: Metadata = {
  title: "Recomendaciones del club",
};

export default function ClubRecommendationsPage() {
  return <ClubRecommendationListScreen />;
}
