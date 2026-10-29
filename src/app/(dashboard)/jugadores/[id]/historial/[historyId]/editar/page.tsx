import type { Metadata } from "next";
import { PlayerHistoryFormScreen } from "@/features/jugadores/components/player-history-form-screen";

export const metadata: Metadata = {
  title: "Corregir historial",
};

export default function PlayerHistoryEditPage() {
  return <PlayerHistoryFormScreen mode="edit" />;
}
