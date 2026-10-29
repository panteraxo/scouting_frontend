import type { Metadata } from "next";
import { ProspectDetailScreen } from "@/features/prospecciones/components/prospect-detail-screen";

export const metadata: Metadata = {
  title: "Detalle de prospección",
};

export default function ProspectDetailPage() {
  return <ProspectDetailScreen />;
}
