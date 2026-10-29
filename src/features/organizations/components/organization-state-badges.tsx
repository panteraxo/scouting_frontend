import type { OrganizationResponse } from "@/types/api";
import {
  operationalBadgeClass,
  operationalStatusLabel,
  verificationBadgeClass,
  verificationLabel,
} from "../labels";

export function OrganizationStateBadges({
  organization,
  showVerification = true,
}: {
  organization: Pick<
    OrganizationResponse,
    "operationalStatus" | "verificationStatus"
  >;
  showVerification?: boolean;
}) {
  return (
    <div className="badgeRow">
      <span className={operationalBadgeClass(organization.operationalStatus)}>
        {operationalStatusLabel(organization.operationalStatus)}
      </span>
      {showVerification ? (
        <span
          className={verificationBadgeClass(organization.verificationStatus)}
        >
          Verificación: {verificationLabel(organization.verificationStatus)}
        </span>
      ) : null}
    </div>
  );
}
