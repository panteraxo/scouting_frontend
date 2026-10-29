import type { Metadata } from "next";
import { PlayerListScreen } from "@/features/jugadores/components/player-list-screen";

export const metadata: Metadata = {
  title: "Jugadores",
};

export default function PlayersPage() {
  return <PlayerListScreen />;
}
