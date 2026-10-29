/** Rutas de interfaz del módulo Usuarios. */
export const ADMIN_USERS_PATH = "/admin/usuarios";
export const ADMIN_USER_CREATE_PATH = `${ADMIN_USERS_PATH}/nuevo`;
export const SCOPED_USER_CREATE_PATH = "/usuarios/nuevo";

export function adminUserDetailPath(id: number): string {
  return `${ADMIN_USERS_PATH}/${id}`;
}

export function adminUserEditPath(id: number): string {
  return `${ADMIN_USERS_PATH}/${id}/editar`;
}

/** API del módulo. */
export const ADMIN_USERS_API = "/admin/users";
export const SCOPED_USERS_API = "/academies/me/users";
