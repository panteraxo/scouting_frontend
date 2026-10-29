"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/auth-provider";
import type {
  OrganizationInput,
  OrganizationKind,
  OrganizationResponse,
} from "@/types/api";
import { kindNoun, kindPlural } from "../labels";
import { createAdminOrganization } from "../organizations-api";
import { ADMIN_ORGANIZATION_PATH } from "../routes";
import { OrganizationAccessRestricted } from "./organization-access-restricted";
import { OrganizationForm } from "./organization-form";

export function AdminOrganizationCreate({
  kind,
}: {
  kind: OrganizationKind;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === "ADMIN";

  if (!isAdmin) {
    return (
      <OrganizationAccessRestricted
        title={`Crear ${kindNoun(kind)}`}
        message={`Solo un administrador puede crear ${kindPlural(kind)}.`}
      />
    );
  }

  const isClub = kind === "club";

  async function handleSubmit(
    input: OrganizationInput,
  ): Promise<OrganizationResponse | undefined> {
    const result = await createAdminOrganization(kind, input);

    // El módulo de academias/clubes es la vista de entrada del recurso.
    router.push(ADMIN_ORGANIZATION_PATH[kind]);
    return result;
  }

  return (
    <div>
      <header className="pageHeader">
        <div>
          <p className="eyebrow">ADMINISTRACIÓN</p>
          <h1>{isClub ? "Registrar nuevo club" : "Nueva academia"}</h1>
          <p>
            {isClub
              ? "Completa la información del club deportivo."
              : "Completa la información de la academia."}
          </p>
        </div>
        <Link
          className="button buttonSecondary"
          href={ADMIN_ORGANIZATION_PATH[kind]}
        >
          {isClub ? "Cancelar" : "Volver a la lista"}
        </Link>
      </header>

      <section className="card">
        <OrganizationForm
          kind={kind}
          mode="create"
          singleColumn={kind === "club"}
          submitLabel={isClub ? "Registrar club" : `Crear ${kindNoun(kind)}`}
          cancelHref={ADMIN_ORGANIZATION_PATH[kind]}
          onSubmit={handleSubmit}
        />
      </section>
    </div>
  );
}
