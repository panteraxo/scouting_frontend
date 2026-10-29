/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from "react";
import type {
  OrganizationDirectoryResponse,
  OrganizationKind,
  OrganizationResponse,
} from "@/types/api";
import {
  displayText,
  formatDateTime,
  formatFoundationYear,
  formatLocation,
  kindTitle,
  safeHttpUrl,
  verificationLabel,
} from "../labels";
import { OrganizationStateBadges } from "./organization-state-badges";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type OrganizationDetailData =
  | OrganizationResponse
  | OrganizationDirectoryResponse;

function DetailItem({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a href={href} target="_blank" rel="noreferrer noopener">
      {children}
    </a>
  );
}

function ValueOrDash({ value }: { value?: string | null }) {
  return <>{displayText(value)}</>;
}

function LinkOrDash({ value }: { value?: string | null }) {
  const url = safeHttpUrl(value);

  if (url) {
    return <ExternalLink href={url}>{displayText(value)}</ExternalLink>;
  }

  return <>{displayText(value)}</>;
}

export function OrganizationDetail({
  kind,
  organization,
  showAdministrativeData = false,
  headerActions,
  notice,
}: {
  kind: OrganizationKind;
  organization: OrganizationDetailData;
  showAdministrativeData?: boolean;
  headerActions?: ReactNode;
  notice?: ReactNode;
}) {
  const fullResponse =
    "operationalStatus" in organization ? organization : null;
  const academyData =
    kind === "academy" && "headquarters" in organization
      ? organization
      : null;
  const clubData =
    kind === "club" && "countryCode" in organization ? organization : null;
  const logoUrl = safeHttpUrl(organization.logoUrl);
  const initials =
    organization.name.trim().slice(0, 2).toUpperCase() || "SP";
  const email =
    organization.institutionalEmail &&
    EMAIL_PATTERN.test(organization.institutionalEmail)
      ? organization.institutionalEmail
      : null;
  const phone = organization.institutionalPhone?.replace(/[^\d+]/g, "") ?? "";
  const canShowInternal = showAdministrativeData && fullResponse !== null;

  return (
    <article>
      <header className="detailHeader">
        <div className="detailIdentity">
          {logoUrl ? (
            <img
              className="detailLogo"
              src={logoUrl}
              alt={`Logo de ${organization.name}`}
            />
          ) : (
            <span className="detailLogoFallback" aria-hidden="true">
              {initials}
            </span>
          )}

          <div>
            <p className="detailCode">{organization.code}</p>
            <h2 className="detailTitle">{organization.name}</h2>
            <p className="detailMeta">
              {kindTitle(kind)} · {displayText(organization.type)} ·{" "}
              {formatLocation(organization)}
            </p>
            {fullResponse ? (
              <div className="sectionSpacer">
                <OrganizationStateBadges
                  organization={fullResponse}
                  showVerification={kind === "club"}
                />
              </div>
            ) : null}
          </div>
        </div>

        {headerActions ? (
          <div className="toolbarActions">{headerActions}</div>
        ) : null}
      </header>

      {notice}

      <div className="detailGrid">
        <section className="card" aria-labelledby="organization-info-title">
          <h2 id="organization-info-title">Información institucional</h2>
          <dl className="metaList">
            <DetailItem label="Tipo">
              <ValueOrDash value={organization.type} />
            </DetailItem>
            <DetailItem label="Año de fundación">
              {formatFoundationYear(organization.foundationYear)}
            </DetailItem>
            {canShowInternal && "ruc" in organization ? (
              <DetailItem label="RUC">
                <ValueOrDash value={organization.ruc} />
              </DetailItem>
            ) : null}
            {academyData ? (
              <DetailItem label="Sede">
                <ValueOrDash value={academyData.headquarters} />
              </DetailItem>
            ) : null}
            {academyData && canShowInternal && fullResponse ? (
              <DetailItem label="Representante registrado">
                <ValueOrDash value={fullResponse.representativeName} />
              </DetailItem>
            ) : null}
            {clubData ? (
              <DetailItem label="País">
                <ValueOrDash value={clubData.countryCode} />
              </DetailItem>
            ) : null}
            {canShowInternal && fullResponse ? (
              <DetailItem label="Última actualización">
                {formatDateTime(fullResponse.updatedAt)}
              </DetailItem>
            ) : null}
          </dl>

          {canShowInternal &&
          clubData &&
          "responsibleNames" in clubData &&
          Array.isArray(clubData.responsibleNames) &&
          clubData.responsibleNames.length > 0 ? (
            <div className="sectionSpacer">
              <h3 className="cardTitle">Responsables</h3>
              <ul className="tagList">
                {clubData.responsibleNames.map((name) => (
                  <li className="tag" key={name}>
                    {name}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {organization.description ? (
            <div className="sectionSpacer">
              <h3 className="cardTitle">Descripción</h3>
              <p className="preLine">{organization.description}</p>
            </div>
          ) : null}
        </section>

        <section className="card" aria-labelledby="organization-contact-title">
          <h2 id="organization-contact-title">Ubicación y contacto</h2>
          <dl className="metaList">
            <DetailItem label="Departamento">
              <ValueOrDash value={organization.departmentName} />
            </DetailItem>
            <DetailItem label="Provincia">
              <ValueOrDash value={organization.provinceName} />
            </DetailItem>
            <DetailItem label="Distrito">
              <ValueOrDash value={organization.districtName} />
            </DetailItem>
            <DetailItem label="Código de ubicación">
              <ValueOrDash value={organization.ubigeoCode} />
            </DetailItem>
            <DetailItem label="Dirección">
              <ValueOrDash value={organization.address} />
            </DetailItem>
            <DetailItem label="Correo institucional">
              {email ? (
                <a href={`mailto:${email}`}>{email}</a>
              ) : (
                displayText(organization.institutionalEmail)
              )}
            </DetailItem>
            <DetailItem label="Teléfono institucional">
              {phone ? <a href={`tel:${phone}`}>{phone}</a> : "—"}
            </DetailItem>
            <DetailItem label="Sitio web">
              <LinkOrDash value={organization.websiteUrl} />
            </DetailItem>
          </dl>

          <div className="sectionSpacer">
            <h3 className="cardTitle">Redes sociales</h3>
            <dl className="metaList">
              <DetailItem label="Instagram">
                <LinkOrDash value={organization.instagramUrl} />
              </DetailItem>
              <DetailItem label="Facebook">
                <LinkOrDash value={organization.facebookUrl} />
              </DetailItem>
              <DetailItem label="YouTube">
                <LinkOrDash value={organization.youtubeUrl} />
              </DetailItem>
              <DetailItem label="TikTok">
                <LinkOrDash value={organization.tiktokUrl} />
              </DetailItem>
            </dl>
          </div>
        </section>
      </div>

      {fullResponse && kind === "club" ? (
        <p className="footnote">
          Verificación actual:{" "}
          {verificationLabel(fullResponse.verificationStatus)}. El estado
          operativo y el estado de verificación son independientes.
        </p>
      ) : null}
    </article>
  );
}
