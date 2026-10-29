import type { Metadata } from "next";
import { PlayerGuardianScreen } from "@/features/jugadores/components/player-guardian-screen";

export const metadata: Metadata = {
  title: "Tutor del jugador",
};

export default function PlayerGuardianPage() {
  return <PlayerGuardianScreen />;
}
