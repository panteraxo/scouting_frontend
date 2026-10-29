import type { Metadata } from "next";
import { Suspense } from "react";
import { InlineLoading } from "@/components/ui/loading";
import { ProspectListScreen } from "@/features/prospecciones/components/prospect-list-screen";

export const metadata: Metadata = {
  title: "Prospecciones",
};

export default function ProspectsPage() {
  return (
    <Suspense fallback={<InlineLoading message="Cargando prospecciones…" />}>
      <ProspectListScreen />
    </Suspense>
  );
}
