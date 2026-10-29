import type { Metadata } from "next";
import { ChangePasswordForm } from "@/features/auth/components/change-password-form";

export const metadata: Metadata = {
  title: "Cambiar contraseña",
};

export default function ChangePasswordPage() {
  return <ChangePasswordForm />;
}
