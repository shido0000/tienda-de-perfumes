/**
 * Constantes del sistema de gestores que también necesita el middleware
 * (runtime EDGE). Este archivo no importa nada de Node ni Prisma a propósito:
 * el middleware no puede cargar esas dependencias.
 */
export const REF_COOKIE = "mm_ref";
export const REF_COOKIE_MAX_AGE = 60 * 60 * 24 * 90; // 90 días
