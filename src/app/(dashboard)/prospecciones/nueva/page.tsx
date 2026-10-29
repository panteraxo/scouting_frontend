import type { Metadata } from "next";
import { Suspense } from "react";
import { InlineLoading } from "@/components/ui/loading";
import { ProspectCreateScreen } from "@/features/prospecciones/components/prospect-create-screen";

export const metadata: Metadata = {
  title: "Nueva prospección",
};

export default function ProspectCreatePage() {
  return (
    <Suspense fallback={<InlineLoading message="Cargando jugador…" />}>
      <ProspectCreateScreen />
    </Suspense>
  );
}
