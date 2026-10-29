/**
 * Rutas de interfaz del módulo Recomendaciones.
 * El listado del ojeador vive dentro del detalle de la prospección; solo se
 * expone la ruta de detalle de cada recomendación.
 */
export const SCOUT_RECOMMENDATION_DETAIL_PREFIX = "/recomendaciones";
export const CLUB_RECOMMENDATIONS_PATH = "/mi-club/recomendaciones";
export const ADMIN_RECOMMENDATIONS_PATH = "/admin/recomendaciones";

export function prospectRecommendationCreatePath(prospectId: number): string {
  return `/prospecciones/${prospectId}/recomendaciones/nueva`;
}

export function scoutRecommendationDetailPath(id: number): string {
  return `${SCOUT_RECOMMENDATION_DETAIL_PREFIX}/${id}`;
}

export function clubRecommendationDetailPath(id: number): string {
  return `${CLUB_RECOMMENDATIONS_PATH}/${id}`;
}

export function adminRecommendationDetailPath(id: number): string {
  return `${ADMIN_RECOMMENDATIONS_PATH}/${id}`;
}

/** API del módulo. */
export const RECOMMENDATIONS_API = "/recommendations";
export const CLUB_RECOMMENDATIONS_API = "/clubs/me/recommendations";
export const ADMIN_RECOMMENDATIONS_API = "/admin/recommendations";
