"use client";

import { useState } from "react";
import { safeHttpUrl } from "../labels";

interface OrganizationLogoProps {
  name: string;
  logoUrl: string | null | undefined;
}

function initialsFromName(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0);

  if (parts.length === 0) {
    return "—";
  }

  const first = parts[0]?.charAt(0) ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.charAt(0) ?? "" : "";

  return `${first}${last}`.toUpperCase() || "—";
}

function LogoImage({
  src,
  name,
  initials,
}: {
  src: string;
  name: string;
  initials: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <span aria-hidden="true">{initials}</span>;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`Logo de ${name}`}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

/**
 * Logo de la organización a partir de su URL http(s).
 * Si la URL no es segura o la imagen falla, muestra las iniciales.
 */
export function OrganizationLogo({ name, logoUrl }: OrganizationLogoProps) {
  const safeUrl = safeHttpUrl(logoUrl);
  const initials = initialsFromName(name);

  return (
    <span className="orgLogo">
      {safeUrl ? (
        <LogoImage key={safeUrl} src={safeUrl} name={name} initials={initials} />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
    </span>
  );
}
