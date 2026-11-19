/**
 * Cookie del gestor (revendedor).
 *
 * El código del gestor vive SOLO en una cookie de SESIÓN: se borra al cerrar
 * el navegador y también en cuanto el visitante entra a la tienda por la
 * dirección normal (sin `?ref=`). Así el recargo de un gestor nunca sigue
 * pegado a un cliente que después entra por la web normal.
 */
export const REF_COOKIE = "mm_ref";

/** Ya no se usa una caducidad larga: la cookie muere con la sesión del navegador. */
export const REF_COOKIE_MAX_AGE = 0;
