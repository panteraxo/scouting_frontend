import type { Metadata } from "next";
import { RegisterScoutForm } from "@/features/auth/components/register-scout-form";

export const metadata: Metadata = {
  title: "Registro de ojeador",
};

export default function ScoutRegistrationPage() {
  return <RegisterScoutForm />;
}
