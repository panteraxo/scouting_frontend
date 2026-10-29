import type { Metadata } from "next";
import { PlayerCreateScreen } from "@/features/jugadores/components/player-create-screen";

export const metadata: Metadata = {
  title: "Nuevo jugador",
};

export default function PlayerCreatePage() {
  return <PlayerCreateScreen />;
}
