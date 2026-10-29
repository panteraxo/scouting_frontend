import type { Metadata } from "next";
import { PlayerHistoryFormScreen } from "@/features/jugadores/components/player-history-form-screen";

export const metadata: Metadata = {
  title: "Nueva entrada de historial",
};

export default function PlayerHistoryCreatePage() {
  return <PlayerHistoryFormScreen mode="create" />;
}
