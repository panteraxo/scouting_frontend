import type { Metadata } from "next";
import { RecommendationCreateScreen } from "@/features/recomendaciones/components/recommendation-create-screen";

export const metadata: Metadata = {
  title: "Nueva recomendación",
};

export default function RecommendationCreatePage() {
  return <RecommendationCreateScreen />;
}
