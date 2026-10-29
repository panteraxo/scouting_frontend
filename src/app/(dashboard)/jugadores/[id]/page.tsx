import type { Metadata } from "next";
import { PlayerDetailScreen } from "@/features/jugadores/components/player-detail-screen";

export const metadata: Metadata = {
  title: "Ficha del jugador",
};

export default function PlayerDetailPage() {
  return <PlayerDetailScreen mode="directory" />;
}
