import type { Metadata } from "next";
import { PlayerDetailScreen } from "@/features/jugadores/components/player-detail-screen";

export const metadata: Metadata = {
  title: "Mi perfil",
};

export default function MyProfilePage() {
  return <PlayerDetailScreen mode="own" />;
}
