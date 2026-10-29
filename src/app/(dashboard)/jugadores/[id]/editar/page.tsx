import type { Metadata } from "next";
import { PlayerEditScreen } from "@/features/jugadores/components/player-edit-screen";

export const metadata: Metadata = {
  title: "Editar jugador",
};

export default function PlayerEditPage() {
  return <PlayerEditScreen />;
}
