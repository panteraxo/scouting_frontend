export interface ApiErrorBody {
  timestamp?: string;
  status: number;
  code?: string;
  message: string;
  path?: string;
  fieldErrors?: Record<string, string> | null;
}

export interface CsrfResponse {
  token: string;
  headerName: string;
  parameterName: string;
}

export type UserRole =
  | "ADMIN"
  | "PROFESSOR"
  | "ACADEMY_DIRECTOR"
  | "SCOUT"
  | "CLUB_MANAGER"
  | "PLAYER";

export type UserStatus = "ACTIVE" | "PENDING_APPROVAL" | "INACTIVE";

export type DocumentType = "DNI" | "CE" | "PASSPORT";

export interface UserResponse {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  role: UserRole;
  status: UserStatus;
  mustChangePassword: boolean;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface ScoutRegistration {
  id: number;
  firstName: string;
  lastName: string;
  documentType: DocumentType;
  documentNumber: string;
  email: string;
  phone: string | null;
  username: string;
  status: UserStatus;
  createdAt: string;
}

export interface ScoutRegistrationQuery {
  status: UserStatus;
  page: number;
  size: number;
}

/** Academia (`academy`) o club (`club`). Se usa para reutilizar pantallas y servicios. */
export type OrganizationKind = "academy" | "club";

/** Estado operativo de una organizacion. Independiente de la verificacion. */
export type OperationalStatus = "ACTIVE" | "INACTIVE";

export type VerificationStatus =
  | "PENDING_VERIFICATION"
  | "VERIFIED"
  | "REJECTED";

/** Estado destino aceptado por `PATCH .../verification`. */
export type VerificationTargetStatus =
  | "PENDING_VERIFICATION"
  | "VERIFIED"
  | "REJECTED";

/** Accion visual del Administrador; se traduce a `VerificationTargetStatus`. */
export type VerificationAction = "VERIFY" | "REJECT" | "REOPEN" | "REVOKE";

/**
 * Conteos derivados de relaciones reales. La API devuelve `null` mientras no
 * exista una fuente real; nunca se interpretan como cero.
 */
export interface OrganizationCounts {
  players?: number | null;
  prospects?: number | null;
  professors?: number | null;
  teams?: number | null;
}

/**
 * Respuesta completa de academia o club (ADMIN, Director/Profesor o
 * Responsable). Contiene estados internos, RUC y datos de representante o
 * responsables segun el tipo.
 *
 * Las vistas de solo lectura usan `AcademyDirectoryResponse` /
 * `ClubDirectoryResponse`, que omiten estos campos sensibles y los estados
 * internos.
 */
export interface OrganizationResponse {
  id: number;
  code: string;
  name: string;
  logoUrl: string | null;
  type: string;
  description: string | null;
  foundationYear: number | null;
  ruc: string | null;
  ubigeoCode: string;
  departmentName: string | null;
  provinceName: string | null;
  districtName: string | null;
  address: string | null;
  institutionalEmail: string | null;
  institutionalPhone: string | null;
  websiteUrl: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  youtubeUrl: string | null;
  tiktokUrl: string | null;
  counts: OrganizationCounts | null;
  operationalStatus: OperationalStatus;
  verificationStatus: VerificationStatus;
  createdAt?: string | null;
  updatedAt?: string | null;
  version?: number | null;
  /** Solo academia. */
  trainingGroups?: string[] | null;
  /** Solo academia. */
  headquarters?: string | null;
  /** Solo academia. */
  representativeName?: string | null;
  /** Solo club. */
  countryCode?: string | null;
  /** Solo club; se deriva de UserOrganization y no incluye datos personales. */
  responsibleNames?: string[] | null;
}

interface OrganizationDirectoryBase {
  id: number;
  code: string;
  name: string;
  logoUrl: string | null;
  type: string;
  description: string | null;
  foundationYear: number | null;
  ubigeoCode: string;
  departmentName: string | null;
  provinceName: string | null;
  districtName: string | null;
  address: string | null;
  institutionalEmail: string | null;
  institutionalPhone: string | null;
  websiteUrl: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  youtubeUrl: string | null;
  tiktokUrl: string | null;
  counts: OrganizationCounts | null;
}

/** Vista publica de academia: sin RUC, representante, estados ni marcas internas. */
export interface AcademyDirectoryResponse extends OrganizationDirectoryBase {
  trainingGroups: string[] | null;
  headquarters: string | null;
}

/** Vista publica de club: sin RUC, responsables, estados ni marcas internas. */
export interface ClubDirectoryResponse extends OrganizationDirectoryBase {
  countryCode: string;
}

export type OrganizationDirectoryResponse =
  | AcademyDirectoryResponse
  | ClubDirectoryResponse;

/**
 * Cuerpo de creacion y edicion. `headquarters`, `representativeName` y
 * `trainingGroups` solo se envian para academias. `countryCode` no se envia.
 */
export interface OrganizationInput {
  name: string;
  logoUrl: string;
  type: string;
  description: string;
  foundationYear: number;
  ruc: string;
  ubigeoCode: string;
  address: string;
  institutionalEmail: string;
  institutionalPhone: string;
  websiteUrl: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  youtubeUrl: string | null;
  tiktokUrl: string | null;
  trainingGroups?: string[];
  headquarters?: string;
  representativeName?: string;
}

export interface OrganizationListQuery {
  page: number;
  size: number;
  sort?: string;
  q?: string;
  type?: string;
  ubigeo?: string;
  operationalStatus?: OperationalStatus;
  verificationStatus?: VerificationStatus;
}

export interface DirectoryQuery {
  page: number;
  size: number;
  sort?: string;
  q?: string;
  type?: string;
  ubigeo?: string;
}

/** Elemento del catalogo local UBIGEO de INEI. */
export interface UbigeoOption {
  code: string;
  name: string;
}

/* -------------------------------------------------------------------------- */
/* Usuarios y asignaciones (SCP-004)                                          */
/* -------------------------------------------------------------------------- */

/**
 * Estados administrables desde el módulo Usuarios. Las solicitudes de ojeador
 * en `PENDING_APPROVAL` se gestionan únicamente desde Solicitudes de ojeador.
 */
export type ManagedUserStatus = "ACTIVE" | "INACTIVE";

/**
 * Referencia mínima de cuenta usada en listados. No incluye documento,
 * teléfono ni contraseña; backend devuelve `UserSummaryResponse`.
 */
export interface ManagedUserSummary {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  academyId: number | null;
  academyCode: string | null;
  academyName: string | null;
  clubId: number | null;
  clubCode: string | null;
  clubName: string | null;
}

/**
 * Detalle administrativo de una cuenta (`UserDetailResponse`). Incluye documento
 * y teléfono, pero nunca contraseña ni hash.
 */
export interface ManagedUser extends ManagedUserSummary {
  documentType: DocumentType | null;
  documentNumber: string | null;
  phone: string | null;
  mustChangePassword: boolean;
  temporaryPasswordExpiresAt?: string | null;
  position: string | null;
  createdAt: string;
  updatedAt: string;
}


/** Filtros aceptados por `GET /admin/users`. `status` solo admite ACTIVE/INACTIVE. */
export interface UserListQuery {
  page: number;
  size: number;
  sort?: string;
  q?: string;
  role?: UserRole;
  status?: ManagedUserStatus;
  academyId?: number;
  clubId?: number;
}

/** Datos de identidad editables de una cuenta. */
export interface UserIdentityInput {
  firstName: string;
  lastName: string;
  documentType: DocumentType;
  documentNumber: string;
  email: string;
  phone: string | null;
  username: string;
}

/**
 * Alta administrativa. El servidor genera la contraseña temporal; el request
 * nunca incluye `password`. Las organizaciones solo se envían cuando el rol
 * las requiere.
 */
export interface UserCreateInput extends UserIdentityInput {
  role: UserRole;
  academyId?: number;
  clubId?: number;
  position?: string;
}

/** Cambio de rol y organización. `position` solo aplica a CLUB_MANAGER. */
export interface UserAssignmentInput {
  role: UserRole;
  academyId?: number;
  clubId?: number;
  position?: string;
}

/**
 * Respuesta de alta o reseteo de contraseña temporal (`UserCreatedResponse`).
 * La cuenta incluida es un resumen: no trae documento, teléfono ni hash.
 */
export interface TemporaryPasswordResult {
  user: ManagedUserSummary;
  temporaryPassword: string;
  temporaryPasswordExpiresAt: string;
}

/** Respuesta de alta: mismo contrato que el reseteo. */
export type CreateUserResult = TemporaryPasswordResult;

/* -------------------------------------------------------------------------- */
/* Jugadores e historial deportivo (SCP-005)                                  */
/* -------------------------------------------------------------------------- */

export type PlayerPosition =
  | "GOALKEEPER"
  | "CENTER_BACK"
  | "FULL_BACK"
  | "WING_BACK"
  | "DEFENSIVE_MIDFIELDER"
  | "CENTRAL_MIDFIELDER"
  | "ATTACKING_MIDFIELDER"
  | "LEFT_MIDFIELDER"
  | "RIGHT_MIDFIELDER"
  | "LEFT_WINGER"
  | "RIGHT_WINGER"
  | "SECOND_STRIKER"
  | "STRIKER";

export type PositionGroup =
  | "GOALKEEPER"
  | "DEFENDER"
  | "MIDFIELDER"
  | "FORWARD";

export type DominantFoot = "LEFT" | "RIGHT" | "BOTH";

export type PlayerOperationalStatus = "ACTIVE" | "INACTIVE";

export type PlayerProfileStatus = "INCOMPLETE" | "COMPLETE";

export type ActivityType =
  | "OFFICIAL_MATCH"
  | "FRIENDLY_MATCH"
  | "TOURNAMENT"
  | "TRAINING"
  | "SPORTS_TRIAL";

export type AgeCategory =
  | "SUB_8"
  | "SUB_10"
  | "SUB_12"
  | "SUB_13"
  | "SUB_14"
  | "SUB_15"
  | "SUB_16"
  | "SUB_17"
  | "SUB_18"
  | "SUB_20"
  | "SUB_23"
  | "SENIOR";

export type CompetitiveLevel =
  | "ACADEMY"
  | "LOCAL"
  | "REGIONAL"
  | "NATIONAL"
  | "INTERNATIONAL";

export type Participation = "STARTER" | "SUBSTITUTE" | "DID_NOT_PLAY";

export type TeamResult = "WIN" | "DRAW" | "LOSS";

export type GuardianConsentStatus =
  | "NOT_RECORDED"
  | "GRANTED"
  | "DENIED"
  | "REVOKED";

export type GuardianDataStatus = "NOT_APPLICABLE" | "MISSING" | "RECORDED";

export interface PlayerResidence {
  departmentCode: string | null;
  departmentName: string | null;
  provinceCode: string | null;
  provinceName: string | null;
  districtCode?: string | null;
  districtName?: string | null;
}

export interface PlayerAcademyRef {
  id: number;
  code: string;
  name: string;
  logoUrl: string | null;
  operationalStatus: OperationalStatus;
  verificationStatus: VerificationStatus;
}

export interface PlayerDirectoryItem {
  id: number;
  firstName: string;
  lastName: string;
  age: number | null;
  yearsExperience: number | null;
  photoUrl: string | null;
  /** Incluidos por `GET /players`; se omiten si el perfil no los registra. */
  heightCm?: number | null;
  weightKg?: number | null;
  position: PlayerPosition | null;
  positionGroup: PositionGroup | null;
  bestPosition: PlayerPosition | null;
  bestPositionGroup: PositionGroup | null;
  dominantFoot: DominantFoot | null;
  residence: PlayerResidence | null;
  academy: PlayerAcademyRef | null;
  /** Omitido para SCOUT. */
  operationalStatus?: PlayerOperationalStatus;
  /** Omitido para SCOUT. */
  profileStatus?: PlayerProfileStatus;
}

export interface PlayerAccountCandidate {
  userId: number;
  firstName: string;
  lastName: string;
}

export interface ActorSummary {
  id: number;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export interface PlayerOwnResponse {
  id: number;
  firstName: string;
  lastName: string;
  birthDate: string;
  age: number | null;
  yearsExperience: number | null;
  heightCm: number | null;
  weightKg: number | null;
  position: PlayerPosition | null;
  positionGroup: PositionGroup | null;
  bestPosition: PlayerPosition | null;
  bestPositionGroup: PositionGroup | null;
  dominantFoot: DominantFoot | null;
  summary: string | null;
  photoUrl: string | null;
  residence: PlayerResidence | null;
  academy: PlayerAcademyRef | null;
  operationalStatus: PlayerOperationalStatus;
  profileStatus: PlayerProfileStatus;
  canEdit: false;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface PlayerAdminDetailResponse {
  id: number;
  userId: number;
  firstName: string;
  lastName: string;
  birthDate: string;
  age: number | null;
  yearsExperience: number | null;
  heightCm: number | null;
  weightKg: number | null;
  position: PlayerPosition | null;
  positionGroup: PositionGroup | null;
  bestPosition: PlayerPosition | null;
  bestPositionGroup: PositionGroup | null;
  dominantFoot: DominantFoot | null;
  summary: string | null;
  photoUrl: string | null;
  residence: PlayerResidence | null;
  academy: PlayerAcademyRef | null;
  operationalStatus: PlayerOperationalStatus;
  profileStatus: PlayerProfileStatus;
  guardianRequired: boolean;
  createdBy: ActorSummary | null;
  updatedBy: ActorSummary | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface PlayerStaffDetailResponse {
  id: number;
  firstName: string;
  lastName: string;
  birthDate: string;
  age: number | null;
  yearsExperience: number | null;
  heightCm: number | null;
  weightKg: number | null;
  position: PlayerPosition | null;
  positionGroup: PositionGroup | null;
  bestPosition: PlayerPosition | null;
  bestPositionGroup: PositionGroup | null;
  dominantFoot: DominantFoot | null;
  summary: string | null;
  photoUrl: string | null;
  residence: PlayerResidence | null;
  academy: PlayerAcademyRef | null;
  operationalStatus: PlayerOperationalStatus;
  profileStatus: PlayerProfileStatus;
  guardianRequired: boolean;
  guardianDataStatus: GuardianDataStatus;
  guardianConsentStatus: GuardianConsentStatus;
  createdBy: ActorSummary | null;
  updatedBy: ActorSummary | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface PlayerScoutDetailResponse {
  id: number;
  firstName: string;
  lastName: string;
  age: number | null;
  yearsExperience: number | null;
  heightCm: number | null;
  weightKg: number | null;
  position: PlayerPosition | null;
  positionGroup: PositionGroup | null;
  bestPosition: PlayerPosition | null;
  bestPositionGroup: PositionGroup | null;
  dominantFoot: DominantFoot | null;
  summary: string | null;
  photoUrl: string | null;
  residence: PlayerResidence | null;
  academy: PlayerAcademyRef | null;
  guardianDataAvailable: boolean;
}

export type PlayerDetailResponse =
  | PlayerOwnResponse
  | PlayerAdminDetailResponse
  | PlayerStaffDetailResponse
  | PlayerScoutDetailResponse;

export interface PlayerCreateInput {
  userId: number;
  birthDate: string;
  residenceUbigeoCode: string;
  heightCm: number | null;
  weightKg: number | null;
  position: PlayerPosition;
  bestPosition: PlayerPosition | null;
  dominantFoot: DominantFoot;
  summary: string | null;
  photoUrl: string | null;
}

/**
 * Alta conjunta de cuenta PLAYER y perfil deportivo (SCP-015). Repite la
 * identidad de `UserCreateInput` sin `role`: el servidor siempre crea el rol
 * PLAYER. `academyId` solo se envía cuando el actor es ADMIN; para el staff de
 * academia el servidor deriva la academia de la sesión.
 */
export interface PlayerAccountCreateInput extends UserIdentityInput {
  academyId?: number;
  birthDate: string;
  residenceUbigeoCode: string;
  heightCm: number | null;
  weightKg: number | null;
  position: PlayerPosition;
  bestPosition: PlayerPosition | null;
  dominantFoot: DominantFoot;
  summary: string | null;
  photoUrl: string | null;
}

/**
 * Respuesta de `POST /players/with-account`. La contraseña temporal solo llega
 * en esta respuesta y no debe persistirse en el navegador.
 */
export interface PlayerAccountCreatedResponse {
  player: PlayerDetailResponse;
  temporaryPassword: string;
  temporaryPasswordExpiresAt: string;
}

export interface PlayerUpdateInput {
  birthDate: string;
  residenceUbigeoCode: string;
  heightCm: number | null;
  weightKg: number | null;
  position: PlayerPosition;
  bestPosition: PlayerPosition | null;
  dominantFoot: DominantFoot;
  summary: string | null;
  photoUrl: string | null;
  version: number;
}

export interface PlayerStatusInput {
  status: PlayerOperationalStatus;
}

export interface PlayerListQuery {
  page: number;
  size: number;
  sort?: string;
  q?: string;
  position?: PlayerPosition;
  positionGroup?: PositionGroup;
  ageMin?: number;
  ageMax?: number;
  regionCode?: string;
  provinceCode?: string;
  districtCode?: string;
  academyId?: number;
  operationalStatus?: PlayerOperationalStatus;
  profileStatus?: PlayerProfileStatus;
}

export interface PlayerAccountCandidateQuery {
  page: number;
  size: number;
  sort?: string;
  q?: string;
  academyId?: number;
}

export interface PlayerHistoryMetrics {
  goalkeeper?: {
    saves: number | null;
    goalsConceded: number | null;
    cleanSheet: boolean | null;
    crossInterventions: number | null;
    passesAttempted: number | null;
    passesCompleted: number | null;
  } | null;
  defender?: {
    successfulTackles: number | null;
    interceptions: number | null;
    clearances: number | null;
    duelsWon: number | null;
    blocks: number | null;
    errorsLeadingToChance: number | null;
  } | null;
  midfielder?: {
    passesAttempted: number | null;
    passesCompleted: number | null;
    interceptions: number | null;
    keyPasses: number | null;
    assists: number | null;
    recoveries: number | null;
    duelsWon: number | null;
    successfulDribbles: number | null;
    shots: number | null;
  } | null;
  forward?: {
    goals: number | null;
    assists: number | null;
    shots: number | null;
    successfulDribbles: number | null;
    chancesCreated: number | null;
    crossesAttempted: number | null;
    crossesCompleted: number | null;
  } | null;
}

export interface PlayerHistoryRatings {
  technical: number | null;
  tactical: number | null;
  physical: number | null;
  mental: number | null;
  overall: number | null;
}

export interface PlayerHistoryInput {
  activityType: ActivityType;
  activityDate: string;
  competition: string | null;
  opponent: string | null;
  ageCategory: AgeCategory | null;
  competitiveLevel: CompetitiveLevel | null;
  positionPlayed: PlayerPosition | null;
  participation: Participation | null;
  minutesPlayed: number | null;
  teamResult: TeamResult | null;
  teamGoals: number | null;
  opponentGoals: number | null;
  playerGoals: number | null;
  assists: number | null;
  yellowCards: number | null;
  redCards: number | null;
  observations: string | null;
  videoUrl: string | null;
  videoTimestampSeconds: number | null;
  videoDescription: string | null;
  metrics: PlayerHistoryMetrics | null;
  ratings: PlayerHistoryRatings | null;
  strengths: string | null;
  improvements: string | null;
  recommendations: string | null;
}

export interface PlayerHistoryCorrectionInput extends PlayerHistoryInput {
  expectedVersion: number;
  correctionReason: string;
}

export interface PlayerHistoryEntryResponse extends PlayerHistoryInput {
  id: number;
  playerId: number;
  positionGroup: PositionGroup | null;
  author: ActorSummary | null;
  lastEditedBy: ActorSummary | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  revisionNumber: number;
}

export interface PlayerHistoryQuery {
  page: number;
  size: number;
  sort?: string;
  activityType?: ActivityType;
  competitiveLevel?: CompetitiveLevel;
  ageCategory?: AgeCategory;
  position?: PlayerPosition;
  year?: number;
  from?: string;
  to?: string;
}

export interface PlayerStatCount {
  value: number | null;
  knownEntries: number;
  totalEntries: number;
  complete: boolean;
  coverage: number | null;
}

export interface PlayerStatAverage {
  value: number | null;
  knownEntries: number;
  totalEntries: number;
  complete: boolean;
  coverage: number | null;
}

export interface PlayerStatsResults {
  wins: PlayerStatCount;
  draws: PlayerStatCount;
  losses: PlayerStatCount;
  unknownResults: number;
  winRate: PlayerStatAverage;
}

export interface PlayerStatsTotals {
  matchesPlayed: PlayerStatCount;
  matchesRecorded: number;
  minutes: PlayerStatCount;
  goals: PlayerStatCount;
  assists: PlayerStatCount;
  yellowCards: PlayerStatCount;
  redCards: PlayerStatCount;
  results: PlayerStatsResults | null;
  averageOverallRating: PlayerStatAverage;
  goalsPerMatch: PlayerStatAverage;
  assistsPerMatch: PlayerStatAverage;
}

export interface PlayerYearStats {
  year: number;
  totals: PlayerStatsTotals;
}

export interface PlayerActivityTypeStats {
  activityType: ActivityType;
  matchLike: boolean;
  entries: number;
  totals: PlayerStatsTotals;
}

export interface PlayerPositionStats {
  position: PlayerPosition | null;
  positionGroup: PositionGroup | null;
  totals: PlayerStatsTotals;
}

export interface PlayerPositionGroupStats {
  positionGroup: PositionGroup | null;
  totals: PlayerStatsTotals;
}

export interface PlayerRatingsStats {
  technical: PlayerStatAverage;
  tactical: PlayerStatAverage;
  physical: PlayerStatAverage;
  mental: PlayerStatAverage;
  overall: PlayerStatAverage;
}

export interface PlayerStats {
  playerId: number;
  career: PlayerStatsTotals;
  byYear: PlayerYearStats[];
  byActivityType: PlayerActivityTypeStats[];
  byPosition: PlayerPositionStats[];
  byPositionGroup: PlayerPositionGroupStats[];
  ratings: PlayerRatingsStats;
}

export interface GuardianConsentResponse {
  status: GuardianConsentStatus;
  recordedAt: string | null;
  recordedBy: ActorSummary | null;
  evidenceUrl: string | null;
  note: string | null;
}

export interface GuardianConsentSummary {
  status: GuardianConsentStatus;
  recordedAt: string | null;
}

export interface PlayerGuardianStaffResponse {
  playerId: number;
  minor: boolean;
  firstName: string;
  lastName: string;
  documentType: DocumentType;
  documentNumber: string;
  phone: string;
  address: string;
  relationship: string;
  consent: GuardianConsentResponse;
  version: number;
  updatedAt: string;
}

export interface PlayerGuardianScoutResponse {
  playerId: number;
  minor: boolean;
  firstName: string;
  lastName: string;
  documentType: DocumentType;
  documentNumber: string;
  phone: string;
  address: string;
  relationship: string;
  consent: GuardianConsentSummary;
}

export interface PlayerGuardianUpsertInput {
  firstName: string;
  lastName: string;
  documentType: DocumentType;
  documentNumber: string;
  phone: string;
  address: string;
  relationship: string;
  version: number | null;
}

export interface GuardianConsentUpdateInput {
  status: "GRANTED" | "DENIED" | "REVOKED";
  evidenceUrl: string | null;
  note: string | null;
}

/* -------------------------------------------------------------------------- */
/* Prospecciones y evaluaciones privadas (SCP-006)                            */
/* -------------------------------------------------------------------------- */

export type ProspectStatus = "FOLLOWING" | "PAUSED" | "CLOSED";

export interface ProspectPlayerSummary {
  id: number;
  firstName: string;
  lastName: string;
  age: number | null;
  position: PlayerPosition | null;
  positionGroup: PositionGroup | null;
  /** Foto del jugador; el backend puede omitirla o devolver null. */
  photoUrl?: string | null;
  academy: PlayerAcademyRef | null;
}

export interface ProspectResponse {
  id: number;
  player: ProspectPlayerSummary;
  status: ProspectStatus;
  privateNotes: string | null;
  startedAt: string;
  lastActivityAt: string;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface ProspectCreateInput {
  playerId: number;
  privateNotes: string | null;
}

export interface ProspectNotesUpdateInput {
  privateNotes: string | null;
  version: number;
}

export interface ProspectStatusUpdateInput {
  status: ProspectStatus;
  version: number;
}

export interface ProspectEvaluation {
  id: number;
  prospectId: number;
  evaluatedAt: string;
  technicalRating: number;
  tacticalRating: number;
  physicalRating: number;
  mentalRating: number;
  overallRating: number | null;
  strengths: string | null;
  improvements: string | null;
  recommendation: string | null;
  privateNotes: string | null;
  videoUrl: string | null;
  createdAt: string;
}

export interface ProspectEvaluationInput {
  evaluatedAt: string;
  technicalRating: number;
  tacticalRating: number;
  physicalRating: number;
  mentalRating: number;
  overallRating: number | null;
  strengths: string | null;
  improvements: string | null;
  recommendation: string | null;
  privateNotes: string | null;
  videoUrl: string | null;
}

export interface ProspectListQuery {
  page: number;
  size: number;
  sort?: string;
  status?: ProspectStatus;
  playerId?: number;
  q?: string;
}

export interface ProspectEvaluationQuery {
  page: number;
  size: number;
}

/* -------------------------------------------------------------------------- */
/* Recomendaciones a clubes (SCP-007)                                         */
/* -------------------------------------------------------------------------- */

export type RecommendationStatus = "SENT" | "RESPONDED";

export type RecommendationResponseStatus =
  | "INTERESTED"
  | "INFO_REQUESTED"
  | "NOT_INTERESTED";

export interface RecommendationPlayerRef {
  id: number;
  firstName: string;
  lastName: string;
  age: number | null;
  position: PlayerPosition | null;
  positionGroup: PositionGroup | null;
}

export interface RecommendationScoutRef {
  id: number;
  firstName: string;
  lastName: string;
}

export interface RecommendationClubRef {
  id: number;
  code: string;
  name: string;
  logoUrl: string | null;
  operationalStatus: OperationalStatus;
  verificationStatus: VerificationStatus;
}

export interface RecommendationSummary {
  id: number;
  prospectId: number;
  player: RecommendationPlayerRef;
  scout: RecommendationScoutRef;
  club: RecommendationClubRef;
  status: RecommendationStatus;
  sentAt: string;
  lastResponseStatus: RecommendationResponseStatus | null;
  lastResponseAt: string | null;
}

export interface RecommendationResponseEntry {
  id: number;
  status: RecommendationResponseStatus;
  message: string;
  respondedAt: string;
}

export interface RecommendationPlayerSnapshot {
  firstName: string;
  lastName: string;
  age: number | null;
  position: PlayerPosition | null;
  positionGroup: PositionGroup | null;
  bestPosition: PlayerPosition | null;
  bestPositionGroup: PositionGroup | null;
  dominantFoot: DominantFoot | null;
  heightCm: number | null;
  weightKg: number | null;
  summary: string | null;
  photoUrl: string | null;
  academy: PlayerAcademyRef | null;
}

export interface RecommendationHistorySnapshot {
  id: number;
  activityType: ActivityType;
  activityDate: string;
  competition: string | null;
  opponent: string | null;
  ageCategory: AgeCategory | null;
  competitiveLevel: CompetitiveLevel | null;
  positionPlayed: PlayerPosition | null;
  positionGroup: PositionGroup | null;
  participation: Participation | null;
  minutesPlayed: number | null;
  teamResult: TeamResult | null;
  teamGoals: number | null;
  opponentGoals: number | null;
  playerGoals: number | null;
  assists: number | null;
  yellowCards: number | null;
  redCards: number | null;
  observations: string | null;
  videoUrl: string | null;
  videoTimestampSeconds: number | null;
  videoDescription: string | null;
  metrics: PlayerHistoryMetrics | null;
  ratings: PlayerHistoryRatings | null;
  strengths: string | null;
  improvements: string | null;
  recommendations: string | null;
}

export interface RecommendationEvaluationSnapshot {
  id: number;
  evaluatedAt: string;
  technicalRating: number;
  tacticalRating: number;
  physicalRating: number;
  mentalRating: number;
  overallRating: number | null;
  strengths: string | null;
  improvements: string | null;
  recommendation: string | null;
  videoUrl: string | null;
}

export interface RecommendationSnapshot {
  player: RecommendationPlayerSnapshot;
  residence: PlayerResidence | null;
  historyEntries: RecommendationHistorySnapshot[];
  evaluations: RecommendationEvaluationSnapshot[];
}

export interface RecommendationDetail {
  id: number;
  prospectId: number;
  player: RecommendationPlayerRef;
  scout: RecommendationScoutRef;
  club: RecommendationClubRef;
  status: RecommendationStatus;
  message: string;
  snapshot: RecommendationSnapshot;
  responses: RecommendationResponseEntry[];
  sentAt: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface RecommendationCreateInput {
  clubId: number;
  message: string;
  historyEntryIds?: number[];
  evaluationIds?: number[];
}

export interface RecommendationClubReplyInput {
  status: RecommendationResponseStatus;
  message: string;
}

export interface RecommendationAdminResponse {
  id: number;
  prospectId: number;
  playerId: number;
  playerFirstName: string;
  playerLastName: string;
  scoutId: number;
  scoutFirstName: string;
  scoutLastName: string;
  clubId: number;
  clubCode: string;
  clubName: string;
  status: RecommendationStatus;
  lastResponseStatus: RecommendationResponseStatus | null;
  lastResponseAt: string | null;
  sentAt: string;
  createdAt: string;
}

export interface PageQuery {
  page: number;
  size: number;
}
