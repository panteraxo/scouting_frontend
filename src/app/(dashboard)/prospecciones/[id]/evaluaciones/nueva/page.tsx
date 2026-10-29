import type { Metadata } from "next";
import { ProspectEvaluationFormScreen } from "@/features/prospecciones/components/prospect-evaluation-form-screen";

export const metadata: Metadata = {
  title: "Nueva evaluación",
};

export default function ProspectEvaluationCreatePage() {
  return <ProspectEvaluationFormScreen />;
}
