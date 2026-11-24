import { parseJson } from "./json";

/**
 * Textos del sitio editables desde Administración → Contenido.
 *
 * TODOS los textos fijos de la web viven acá: la barra superior, la portada,
 * los filtros y los estados vacíos del catálogo, la ficha del perfume, el
 * carrito, el checkout, las reservas, la cuenta, el ingreso/registro, el quiz
 * de aromas, la lista de deseos, el pie y los enlaces legales.
 *
 * Si el dueño deja un campo vacío, se usa el texto por defecto de abajo, así
 * nunca queda un hueco en la web.
 */

export const DEFAULT_SITE_TEXTS = {
  // ---- Barra superior (nav) -------------------------------------------
  navCatalog: "Catálogo",
  navQuiz: "Encontrá tu aroma",
  navOffers: "Ofertas",
  navSale: "Rebajas",
  navWishlist: "Lista de deseos",
  navReservations: "Mis reservas",
  navAccount: "Mi cuenta",
  navProfile: "Mi perfil",
  navLogin: "Ingresar",
  navLogout: "Cerrar sesión",
  navPanel: "Panel",
  navCart: "Carrito",
  navOpenMenu: "Abrir menú",
  navCloseMenu: "Cerrar menú",

  // ---- Portada: secciones ---------------------------------------------
  heroCta: "Ver el catálogo",
  heroSecondaryCta: "Ver el carrito",
  catalogTitle: "Nuestros perfumes",
  catalogIntro:
    "Filtrá por familia olfativa, marca, precio o para quién es para encontrar tu fragancia.",
  offerTitle: "Ofertas",
  offerSubtitle:
    "Combinaciones de productos a un precio especial. Se descuentan del inventario al reservarlas.",
  offerLink: "Ver todas las ofertas",
  offerPageIntro:
    "Combinaciones de perfumes a un precio especial. Se descuentan del inventario al reservarlas.",
  offerEmptyTitle: "No hay ofertas activas",
  offerEmptyBody:
    "Cuando la tienda publique una combinación con descuento, aparece acá.",
  saleTitle: "Rebajas",
  saleIntro: "Fragancias con un precio anterior mejor: el descuento ya está aplicado.",
  salePageIntro: "Fragancias con un precio anterior mejor: el descuento ya está aplicado.",
  saleEmptyTitle: "No hay rebajas por ahora",
  saleEmptyBody: "Volvé pronto: las rebajas cambian con el inventario de la tienda.",
  reviewsTitle: "Lo que dicen quienes ya lo tienen",
  paymentsTitle: "Formas de pago",
  paymentsIntro:
    "No cobramos online. Al confirmar la reserva, la tienda recibe tu pedido y te escribe para arreglar el pago y la entrega.",
  paymentsTransferTitle: "Transferencia",
  paymentsTransferIntro: "Transferí a estos datos y mandanos el comprobante.",
  paymentsCashTitle: "Efectivo",
  paymentsCashIntro:
    "Pagás cuando retirás en tienda o al recibir el envío. Coordinamos por WhatsApp.",
  paymentsWhatsappCta: "Coordinar por WhatsApp",
  homeLegalNote:
    "Reservás online y la tienda confirma por WhatsApp. Los textos legales son una base editable: hacelos revisar por un abogado antes de publicar.",
  homeLegalLink: "Leer términos y condiciones",

  // ---- Catálogo: filtros y estados ------------------------------------
  filterCategory: "Categoría",
  filterBrand: "Marca",
  filterGender: "Para quién",
  filterOccasion: "Ocasión",
  filterPrice: "Precio",
  filterSort: "Ordenar",
  filterSearch: "Buscar",
  filterSearchPlaceholder: "Nombre, marca o nota…",
  optAllCategories: "Todas",
  optAllBrands: "Todas",
  optAllGenders: "Todos",
  optAllOccasions: "Todas",
  genderWoman: "Mujer",
  genderMan: "Hombre",
  genderUnisex: "Unisex",
  occasionDay: "Día",
  occasionNight: "Noche",
  occasionBoth: "Día y noche",
  sortNewest: "Más recientes",
  sortPriceAsc: "Precio: menor a mayor",
  sortPriceDesc: "Precio: mayor a menor",
  sortName: "Nombre (A–Z)",
  filterMinPrice: "Desde",
  filterMaxPrice: "Hasta",
  filterToggle: "Filtros",
  filterSearchAria: "Buscar perfumes",
  filterInStockChip: "Con stock",
  filterOnlyStock: "Solo con existencias",
  countProductSingular: "producto",
  countProductPlural: "productos",
  activeFiltersLabel: "Filtros activos:",
  clearFilters: "Limpiar filtros",
  emptySearchTitle: "No encontramos productos",
  emptySearchQuery: "Nada coincide con lo que buscás. Probá con la categoría o el nombre de la marca.",
  emptySearchFilters: "Ningún producto coincide con estos filtros.",
  emptySearchCta: "Ver todo el catálogo",
  emptyCatalogTitle: "El catálogo está vacío",
  emptyCatalogBody:
    "Todavía no hay perfumes publicados. Si administrás la tienda, entrá al panel para cargar el primero; el catálogo se actualiza solo.",
  emptyCatalogCta: "Ir al panel",

  // ---- Ficha del producto ---------------------------------------------
  pdNotesLabel: "Pirámide olfativa:",
  pdAddCart: "Agregar al carrito",
  pdAdded: "Agregado",
  pdSoldOut: "Sin stock",
  pdSave: "Guardar",
  pdSaved: "En deseos",
  pdFaqTitle: "Preguntas frecuentes",
  pdTogetherTitle: "Comprá junto con",
  pdQuantityMinus: "Restar una unidad",
  pdQuantityPlus: "Sumar una unidad",
  pdBackToCatalog: "Volver al catálogo",
  pdStockAvailable: "disponibles",
  pdAvailable: "Disponible",
  comingSoonTitle: "Próximamente",
  comingSoonIntro:
    "Estos perfumes están agotados por ahora. Dejá tu correo o WhatsApp en la ficha y te avisamos en cuanto vuelvan.",
  pdLoginToSave: "Ingresá para guardar este producto en tu lista de deseos.",
  pdSavedNotice: "Guardado en tu lista de deseos.",
  pdUnsavedNotice: "Quitado de tu lista.",
  comboAdd: "Agregar oferta",
  comboAdded: "Agregada",
  reviewsHeading: "Opiniones",
  reviewsLoading: "Cargando opiniones…",
  reviewsFormTitle: "Contá tu experiencia",

  // ---- Carrito ---------------------------------------------------------
  cartTitle: "Carrito",
  cartSubtitle: "Reservás todos los productos juntos en un solo checkout.",
  cartItemEach: "c/u",
  cartRemove: "Quitar",
  cartSummary: "Resumen",
  cartSubtotal: "Subtotal",
  cartShipping: "Envío",
  cartShippingPending: "Se calcula al elegir entrega",
  cartTotal: "Total estimado",
  cartCurrencyNote: "Todos los precios se convierten a la moneda de la orden al confirmar.",
  cartCurrencyMixed:
    "Los productos tienen monedas distintas; al confirmar se convierten todos a esta moneda y los importes quedan fijos.",
  cartCheckoutCta: "Continuar al checkout",
  cartNeedAccount: "Necesitás una cuenta para que la reserva quede guardada en “Mis reservas”.",
  cartLoginNotice: "Ingresá con tu cuenta para completar la reserva y guardarla.",
  cartPolicyLink: "Política de reservas y pagos",
  cartEmptyTitle: "Tu carrito está vacío",
  cartEmptyBody:
    "Todavía no agregaste ninguna fragancia. El catálogo tiene perfumes esperando por vos.",
  cartEmptyCta: "Ver el catálogo",

  // ---- Checkout --------------------------------------------------------
  checkoutTitle: "Checkout",
  checkoutEmptyTitle: "No hay nada para reservar",
  checkoutPickup: "Retiro en tienda",
  checkoutPickupNote: "Sin costo de envío",
  checkoutDelivery: "Envío a domicilio",
  checkoutPickupAt: "Retirás en",
  checkoutCalculating: "Calculando distancia…",
  checkoutDistance: "Distancia desde la tienda",
  checkoutShippingCost: "Costo de envío",
  checkoutMaxRadius: "Radio máximo",
  checkoutTransfer: "Transferencia",
  checkoutTransferNote: "Enviás el comprobante",
  checkoutCash: "Efectivo",
  checkoutCashNote: "Al retirar o recibir",
  checkoutYourReservation: "Tu reserva",
  checkoutSubtotal: "Subtotal",
  checkoutTotal: "Total",

  // ---- Reservas y cuenta ----------------------------------------------
  resTitle: "Mis reservas",
  resEmptyTitle: "Todavía no tenés reservas",
  resSubtotal: "Subtotal",
  resTotal: "Total",
  accountRecentReservations: "Mis últimas reservas",
  accountMyData: "Mis datos",
  accountName: "Nombre",
  accountEmail: "Email de la cuenta",
  accountChangePassword: "Cambiar contraseña",
  accountPasswordHint: "Dejalo vacío si no querés cambiarla ahora.",

  // ---- Ingreso / registro ---------------------------------------------
  authLoginTitle: "Ingresar",
  authRegisterTitle: "Crear cuenta",
  authLoginIntro: "Entrá para ver tus reservas y tu lista de deseos.",
  authRegisterIntro:
    "Con una cuenta guardamos tus reservas, tus favoritos y tu carrito.",
  authNameLabel: "Nombre",
  authPhoneLabel: "Teléfono",
  authPhoneHint: "Para avisarte por tu reserva.",
  authEmailLabel: "Email",
  authPasswordLabel: "Contraseña",
  authVerifying: "Verificamos tus datos, un momento.",
  authAdminPrompt: "¿Administrás la tienda?",

  // ---- Quiz de aromas --------------------------------------------------
  quizTitle: "Encontrá tu aroma",
  quizIntro:
    "Respondé unas preguntas cortas y te mostramos las fragancias que mejor van con vos.",
  quizResultTitle: "Tu selección",

  // ---- Lista de deseos -------------------------------------------------
  wishlistTitle: "Lista de deseos",
  wishlistEmptyTitle: "Tu lista de deseos está vacía",
  wishlistEmptyBody:
    "Guardá los perfumes que te gustan con el corazón y los encontrás acá cuando vuelvas.",

  // ---- Pie -------------------------------------------------------------
  footerAbout: "Reservas online con retiro en tienda o envío coordinado.",
  footerStoreHeading: "Tienda",
  footerWhatsappLabel: "WhatsApp",
  footerLegalHeading: "Legal",
  footerLinkTerms: "Términos",
  footerLinkPrivacy: "Privacidad",
  footerLinkCookies: "Cookies",
  footerLinkReservations: "Reservas y pagos",

  // ---- Estados globales ------------------------------------------------
  notFoundTitle: "No encontramos esta página",
  notFoundBody: "El enlace puede estar viejo o la página se movió. Volvé al catálogo.",
  notFoundCta: "Ir a la portada",
  offlineTitle: "Sin conexión",
  offlineEyebrow: "Sin conexión",
  offlineHeadline: "No pudimos cargar la página",
  offlineBody:
    "Parece que se cortó internet. Tus productos y reservas siguen guardados: cuando vuelvas a tener señal, recargá y todo aparece igual.",
  offlineCta: "Reintentar",

  // ---- Resto de páginas: cuentas, legales, instalación, chat -----------
  heroImageAlt: "Perfume destacado de la tienda",
  heroCartCta: "Revisar mi carrito",
  heroPickupLabel: "Retiro",
  heroPickupValue: "Sin costo",
  heroShippingLabel: "Envío",
  heroShippingValue: "Por kilómetro",
  heroPaymentLabel: "Pago",
  heroPaymentValue: "Efectivo o transferencia",
  accountTitle: "Mi cuenta",
  profileTitle: "Mis datos",
  profileSave: "Guardar cambios",
  profileSaved: "Datos guardados.",
  profilePasswordCurrent: "Contraseña actual",
  profilePasswordNew: "Contraseña nueva",
  profilePasswordSave: "Cambiar contraseña",
  profilePasswordDone: "Contraseña actualizada.",
  resDetailTitle: "Detalle de la reserva",
  resCodeLabel: "Código",
  resStatusLabel: "Estado",
  resItemsLabel: "Productos",
  resDateLabel: "Fecha",
  resCopyCode: "Copiar código",
  resCopied: "Copiado",
  resBackToList: "Volver a mis reservas",
  resReceiptLink: "Ver comprobante",
  authLoginCta: "Ingresar",
  authRegisterCta: "Crear mi cuenta",
  authHaveAccount: "¿Ya tenés cuenta? Ingresá",
  authNoAccount: "¿No tenés cuenta? Registrate",
  authForgotPassword: "Olvidé mi contraseña",
  quizStart: "Empezar",
  quizRestart: "Volver a empezar",
  quizAddResult: "Agregar al carrito",
  wishlistRemove: "Quitar de la lista",
  legalBackHome: "Volver a la portada",
  legalUpdatedLabel: "Última actualización",
  installTitle: "Llevá Mist & Mood en tu teléfono",
  installIntro:
    "Se abre como una app: ícono en la pantalla de inicio, a pantalla completa y con el carrito y tus reservas a mano, incluso con mala conexión.",
  installButton: "Instalar app",
  installInstalled: "Instalada",
  installUpdate: "Actualizar app",
  installHelpToggle: "¿Cómo se instala?",
  installHelpIos:
    "En el iPhone o iPad: abrí esta página en Safari, tocá el botón Compartir (el cuadro con la flecha hacia arriba) y elegí Añadir a pantalla de inicio.",
  installHelpAndroid:
    "En Android con Chrome: tocá el menú de tres puntos arriba a la derecha y elegí Instalar aplicación. En el ordenador, buscá el ícono de instalar en la barra de direcciones.",
  installIosHint: "En iPhone: tocá Compartir y después \"Agregar a inicio\".",
  installDismiss: "Ahora no",
  chatTitle: "Asistente de la tienda",
  chatIntro: "Preguntá por perfumes, precios o tu reserva.",
  chatPlaceholder: "Escribí tu pregunta…",
  chatSend: "Enviar",
  chatOpenAria: "Abrir el chat de la tienda",
  chatCloseAria: "Cerrar el chat",
  chatError: "No pudimos responder ahora. Probá de nuevo en un momento.",
  whatsappFloatAria: "Escribir por WhatsApp",
  stockAlertTitle: "Avisame cuando llegue",
  stockAlertIntro: "Dejanos tu email y te avisamos en cuanto vuelva a haber stock.",
  stockAlertEmail: "Tu email",
  stockAlertSubmit: "Avisarme",
  stockAlertSuccess: "Listo, te avisamos cuando vuelva.",
  waitlistTitle: "Avisame del lanzamiento",
  waitlistIntro: "Dejanos tus datos y te escribimos cuando abramos.",
  waitlistName: "Tu nombre",
  waitlistEmail: "Tu email",
  waitlistPhone: "Tu teléfono",
  waitlistSubmit: "Anotarme",
  waitlistSuccess: "¡Listo! Te avisamos cuando abramos.",
  waitlistNote: "Usamos tus datos sólo para avisarte del lanzamiento.",
  checkoutNeedLogin: "Ingresá para confirmar la reserva.",
  checkoutConfirm: "Confirmar reserva",
  checkoutConfirming: "Confirmando…",
  checkoutAddressLabel: "Dirección de entrega",
  checkoutPhoneLabel: "Teléfono de contacto",
  checkoutNotesLabel: "Notas para la tienda",
  checkoutPaymentLabel: "Forma de pago",
  checkoutEmptyBody: "Agregá algún perfume al carrito para reservarlo.",
  checkoutEmptyCta: "Ver el catálogo",
};

export type SiteTexts = { [K in keyof typeof DEFAULT_SITE_TEXTS]: string };

export type SiteTextKey = keyof SiteTexts;

/**
 * Forma en la que se agrupa el formulario del panel.
 */
export type SiteTextField = {
  key: SiteTextKey;
  label: string;
  group: string;
  long?: boolean;
};

const F = (key: SiteTextKey, label: string, group: string, long = false): SiteTextField => ({
  key,
  label,
  group,
  ...(long ? { long: true } : {}),
});

const NAV = "Barra superior";
const HOME = "Portada";
const CAT = "Catálogo";
const PD = "Ficha del producto";
const CART = "Carrito y checkout";
const ACC = "Cuenta y reservas";
const AUTH = "Ingresar / Registro";
const EXTRA = "Extras";
const FOOT = "Pie de página";

export const SITE_TEXT_FIELDS: SiteTextField[] = [
  F("navCatalog", "Menú · Catálogo", NAV),
  F("navQuiz", "Menú · Encontrá tu aroma", NAV),
  F("navOffers", "Menú · Ofertas", NAV),
  F("navSale", "Menú · Rebajas", NAV),
  F("navWishlist", "Menú · Lista de deseos", NAV),
  F("navReservations", "Menú · Mis reservas", NAV),
  F("navAccount", "Menú · Mi cuenta", NAV),
  F("navProfile", "Menú · Mi perfil", NAV),
  F("navLogin", "Botón Ingresar", NAV),
  F("navLogout", "Botón Cerrar sesión", NAV),
  F("navPanel", "Botón Panel (admin)", NAV),
  F("navCart", "Ícono del carrito", NAV),
  F("navOpenMenu", "Menú móvil · abrir", NAV),
  F("navCloseMenu", "Menú móvil · cerrar", NAV),

  F("heroCta", "Portada · botón principal", HOME),
  F("heroSecondaryCta", "Portada · botón secundario (carrito)", HOME),
  F("catalogTitle", "Catálogo · título", HOME),
  F("catalogIntro", "Catálogo · texto de ayuda", HOME, true),
  F("offerTitle", "Ofertas · título", HOME),
  F("offerSubtitle", "Ofertas · subtítulo (portada)", HOME, true),
  F("offerLink", "Ofertas · enlace 'ver todas'", HOME),
  F("offerPageIntro", "Ofertas · texto de la página /ofertas", HOME, true),
  F("offerEmptyTitle", "Ofertas · título cuando no hay", HOME),
  F("offerEmptyBody", "Ofertas · texto cuando no hay", HOME, true),
  F("saleTitle", "Rebajas · título", HOME),
  F("saleIntro", "Rebajas · subtítulo (portada)", HOME, true),
  F("salePageIntro", "Rebajas · texto de la página /rebajas", HOME, true),
  F("saleEmptyTitle", "Rebajas · título cuando no hay", HOME),
  F("saleEmptyBody", "Rebajas · texto cuando no hay", HOME, true),
  F("reviewsTitle", "Opiniones · título", HOME),
  F("paymentsTitle", "Formas de pago · título", HOME),
  F("paymentsIntro", "Formas de pago · texto", HOME, true),
  F("paymentsTransferTitle", "Formas de pago · título 'Transferencia'", HOME),
  F("paymentsTransferIntro", "Formas de pago · texto de transferencia", HOME, true),
  F("paymentsCashTitle", "Formas de pago · título 'Efectivo'", HOME),
  F("paymentsCashIntro", "Formas de pago · texto de efectivo", HOME, true),
  F("paymentsWhatsappCta", "Formas de pago · botón 'Coordinar por WhatsApp'", HOME),
  F("homeLegalNote", "Portada · nota legal del pie", HOME, true),
  F("homeLegalLink", "Portada · enlace a términos", HOME),

  F("filterSearch", "Filtros · rótulo del buscador", CAT),
  F("filterSearchPlaceholder", "Filtros · texto del buscador", CAT),
  F("filterCategory", "Filtros · categoría", CAT),
  F("filterBrand", "Filtros · marca", CAT),
  F("filterGender", "Filtros · para quién", CAT),
  F("filterOccasion", "Filtros · ocasión", CAT),
  F("filterPrice", "Filtros · precio", CAT),
  F("filterSort", "Filtros · ordenar", CAT),
  F("filterMinPrice", "Filtros · precio mínimo", CAT),
  F("filterMaxPrice", "Filtros · precio máximo", CAT),
  F("filterOnlyStock", "Filtros · solo con existencias", CAT),
  F("filterToggle", "Catálogo · botón Filtros", CAT),
  F("filterSearchAria", "Filtros · descripción del buscador (lector)", CAT),
  F("filterInStockChip", "Catálogo · etiqueta 'con stock'", CAT),
  F("optAllCategories", "Filtros · opción 'todas las categorías'", CAT),
  F("optAllBrands", "Filtros · opción 'todas las marcas'", CAT),
  F("optAllGenders", "Filtros · opción 'todos los géneros'", CAT),
  F("optAllOccasions", "Filtros · opción 'todas las ocasiones'", CAT),
  F("genderWoman", "Filtros · Mujer", CAT),
  F("genderMan", "Filtros · Hombre", CAT),
  F("genderUnisex", "Filtros · Unisex", CAT),
  F("occasionDay", "Filtros · Día", CAT),
  F("occasionNight", "Filtros · Noche", CAT),
  F("occasionBoth", "Filtros · Día y noche", CAT),
  F("sortNewest", "Filtros · orden más recientes", CAT),
  F("sortPriceAsc", "Filtros · orden precio menor a mayor", CAT),
  F("sortPriceDesc", "Filtros · orden precio mayor a menor", CAT),
  F("sortName", "Filtros · orden nombre A–Z", CAT),
  F("countProductSingular", "Catálogo · 'producto' (singular)", CAT),
  F("countProductPlural", "Catálogo · 'productos' (plural)", CAT),
  F("activeFiltersLabel", "Catálogo · rótulo de filtros activos", CAT),
  F("comingSoonTitle", "Catálogo · título de la sección 'Próximamente'", CAT),
  F("comingSoonIntro", "Catálogo · texto de la sección 'Próximamente'", CAT, true),
  F("clearFilters", "Catálogo · botón limpiar filtros", CAT),
  F("emptySearchTitle", "Catálogo · título sin resultados", CAT),
  F("emptySearchQuery", "Catálogo · texto sin resultados de búsqueda", CAT, true),
  F("emptySearchFilters", "Catálogo · texto sin resultados de filtros", CAT, true),
  F("emptySearchCta", "Catálogo · botón sin resultados", CAT),
  F("emptyCatalogTitle", "Catálogo · título catálogo vacío", CAT),
  F("emptyCatalogBody", "Catálogo · texto catálogo vacío", CAT, true),
  F("emptyCatalogCta", "Catálogo · botón catálogo vacío", CAT),

  F("pdNotesLabel", "Ficha · rótulo de la pirámide olfativa", PD),
  F("pdAddCart", "Ficha · botón agregar al carrito", PD),
  F("pdAdded", "Ficha · botón después de agregar", PD),
  F("pdSoldOut", "Ficha · texto sin stock", PD),
  F("pdSave", "Ficha · botón guardar en deseos", PD),
  F("pdSaved", "Ficha · botón ya guardado", PD),
  F("pdFaqTitle", "Ficha · título de preguntas frecuentes", PD),
  F("pdTogetherTitle", "Ficha · título 'comprá junto con'", PD),
  F("pdQuantityMinus", "Ficha · botón restar unidad (lector de pantalla)", PD),
  F("pdQuantityPlus", "Ficha · botón sumar unidad (lector de pantalla)", PD),
  F("pdBackToCatalog", "Ficha · enlace volver al catálogo", PD),
  F("pdStockAvailable", "Ficha/tarjeta · sufijo 'disponibles'", PD),
  F("pdAvailable", "Ficha/tarjeta · cuando la cantidad está oculta", PD),
  F("pdLoginToSave", "Ficha · aviso para ingresar antes de guardar", PD, true),
  F("pdSavedNotice", "Ficha · aviso al guardar en deseos", PD),
  F("pdUnsavedNotice", "Ficha · aviso al quitar de deseos", PD),
  F("comboAdd", "Ofertas · botón agregar oferta", PD),
  F("comboAdded", "Ofertas · botón ya agregada", PD),
  F("reviewsHeading", "Opiniones · título de la sección", PD),
  F("reviewsLoading", "Opiniones · cargando", PD),
  F("reviewsFormTitle", "Opiniones · título del formulario", PD),

  F("cartTitle", "Carrito · título", CART),
  F("cartSubtitle", "Carrito · subtítulo", CART, true),
  F("cartItemEach", "Carrito · sufijo 'c/u'", CART),
  F("cartRemove", "Carrito · botón quitar", CART),
  F("cartSummary", "Carrito · título del resumen", CART),
  F("cartSubtotal", "Carrito · subtotal", CART),
  F("cartShipping", "Carrito · envío", CART),
  F("cartShippingPending", "Carrito · texto del envío pendiente", CART),
  F("cartTotal", "Carrito · total", CART),
  F("cartCurrencyNote", "Carrito · nota de moneda", CART, true),
  F("cartCurrencyMixed", "Carrito · nota de monedas mezcladas", CART, true),
  F("cartCheckoutCta", "Carrito · botón continuar al checkout", CART),
  F("cartNeedAccount", "Carrito · aviso de cuenta", CART, true),
  F("cartLoginNotice", "Carrito · aviso al intentar sin cuenta", CART, true),
  F("cartPolicyLink", "Carrito · enlace a política de reservas", CART),
  F("cartEmptyTitle", "Carrito · título vacío", CART),
  F("cartEmptyBody", "Carrito · texto vacío", CART, true),
  F("cartEmptyCta", "Carrito · botón vacío", CART),

  F("checkoutTitle", "Checkout · título", CART),
  F("checkoutEmptyTitle", "Checkout · título sin productos", CART),
  F("checkoutPickup", "Checkout · retiro en tienda", CART),
  F("checkoutPickupNote", "Checkout · nota retiro sin costo", CART),
  F("checkoutDelivery", "Checkout · envío a domicilio", CART),
  F("checkoutPickupAt", "Checkout · rótulo 'retirás en'", CART),
  F("checkoutCalculating", "Checkout · calculando distancia", CART),
  F("checkoutDistance", "Checkout · distancia", CART),
  F("checkoutShippingCost", "Checkout · costo de envío", CART),
  F("checkoutMaxRadius", "Checkout · radio máximo", CART),
  F("checkoutTransfer", "Checkout · pago por transferencia", CART),
  F("checkoutTransferNote", "Checkout · nota de transferencia", CART),
  F("checkoutCash", "Checkout · pago en efectivo", CART),
  F("checkoutCashNote", "Checkout · nota de efectivo", CART),
  F("checkoutYourReservation", "Checkout · título 'tu reserva'", CART),
  F("checkoutSubtotal", "Checkout · subtotal", CART),
  F("checkoutTotal", "Checkout · total", CART),

  F("resTitle", "Reservas · título", ACC),
  F("resEmptyTitle", "Reservas · título sin reservas", ACC),
  F("resSubtotal", "Reservas · subtotal", ACC),
  F("resTotal", "Reservas · total", ACC),
  F("accountRecentReservations", "Cuenta · título últimas reservas", ACC),
  F("accountMyData", "Cuenta · título mis datos", ACC),
  F("accountName", "Cuenta · rótulo nombre", ACC),
  F("accountEmail", "Cuenta · rótulo email", ACC),
  F("accountChangePassword", "Cuenta · título cambiar contraseña", ACC),
  F("accountPasswordHint", "Cuenta · ayuda de la contraseña", ACC, true),

  F("authLoginTitle", "Ingreso · título", AUTH),
  F("authRegisterTitle", "Registro · título", AUTH),
  F("authLoginIntro", "Ingreso · texto de ayuda", AUTH, true),
  F("authRegisterIntro", "Registro · texto de ayuda", AUTH, true),
  F("authNameLabel", "Registro · rótulo nombre", AUTH),
  F("authPhoneLabel", "Registro · rótulo teléfono", AUTH),
  F("authPhoneHint", "Registro · ayuda del teléfono", AUTH),
  F("authEmailLabel", "Ingreso · rótulo email", AUTH),
  F("authPasswordLabel", "Ingreso · rótulo contraseña", AUTH),
  F("authVerifying", "Ingreso · texto de verificación", AUTH),
  F("authAdminPrompt", "Ingreso · aviso para administradores", AUTH),

  F("quizTitle", "Quiz · título", EXTRA),
  F("quizIntro", "Quiz · texto de ayuda", EXTRA, true),
  F("quizResultTitle", "Quiz · título del resultado", EXTRA),
  F("wishlistTitle", "Deseos · título", EXTRA),
  F("wishlistEmptyTitle", "Deseos · título vacío", EXTRA),
  F("wishlistEmptyBody", "Deseos · texto vacío", EXTRA, true),
  F("notFoundTitle", "Página no encontrada · título", EXTRA),
  F("notFoundBody", "Página no encontrada · texto", EXTRA, true),
  F("notFoundCta", "Página no encontrada · botón", EXTRA),
  F("offlineTitle", "Sin conexión · título", EXTRA),
  F("offlineEyebrow", "Sin conexión · rótulo superior", EXTRA),
  F("offlineHeadline", "Sin conexión · encabezado", EXTRA),
  F("offlineBody", "Sin conexión · texto", EXTRA, true),
  F("offlineCta", "Sin conexión · botón reintentar", EXTRA),
  F("heroImageAlt", "Portada · texto alternativo de la foto", HOME),
  F("heroCartCta", "Portada · botón 'revisar carrito'", HOME),
  F("heroPickupLabel", "Portada · rótulo retiro", HOME),
  F("heroPickupValue", "Portada · valor retiro", HOME),
  F("heroShippingLabel", "Portada · rótulo envío", HOME),
  F("heroShippingValue", "Portada · valor envío", HOME),
  F("heroPaymentLabel", "Portada · rótulo pago", HOME),
  F("heroPaymentValue", "Portada · valor pago", HOME),
  F("accountTitle", "Mi cuenta · título", ACC),
  F("profileTitle", "Mi perfil · título", ACC),
  F("profileSave", "Mi perfil · botón guardar", ACC),
  F("profileSaved", "Mi perfil · aviso al guardar", ACC),
  F("profilePasswordCurrent", "Mi perfil · contraseña actual", ACC),
  F("profilePasswordNew", "Mi perfil · contraseña nueva", ACC),
  F("profilePasswordSave", "Mi perfil · botón cambiar contraseña", ACC),
  F("profilePasswordDone", "Mi perfil · contraseña actualizada", ACC),
  F("resDetailTitle", "Reserva · título del detalle", ACC),
  F("resCodeLabel", "Reserva · rótulo del código", ACC),
  F("resStatusLabel", "Reserva · rótulo del estado", ACC),
  F("resItemsLabel", "Reserva · rótulo de productos", ACC),
  F("resDateLabel", "Reserva · rótulo de la fecha", ACC),
  F("resCopyCode", "Reserva · botón copiar código", ACC),
  F("resCopied", "Reserva · código copiado", ACC),
  F("resBackToList", "Reserva · volver a la lista", ACC),
  F("resReceiptLink", "Reserva · enlace al comprobante", ACC),
  F("authLoginCta", "Ingreso · botón ingresar", AUTH),
  F("authRegisterCta", "Registro · botón crear cuenta", AUTH),
  F("authHaveAccount", "Ingreso · texto 'ya tenés cuenta'", AUTH),
  F("authNoAccount", "Ingreso · texto 'no tenés cuenta'", AUTH),
  F("authForgotPassword", "Ingreso · olvidé mi contraseña", AUTH),
  F("quizStart", "Quiz · botón empezar", EXTRA),
  F("quizRestart", "Quiz · botón volver a empezar", EXTRA),
  F("quizAddResult", "Quiz · botón agregar resultado", EXTRA),
  F("wishlistRemove", "Deseos · botón quitar", EXTRA),
  F("legalBackHome", "Legal · volver a la portada", FOOT),
  F("legalUpdatedLabel", "Legal · rótulo de última actualización", FOOT),
  F("installTitle", "Instalar app · título", EXTRA),
  F("installIntro", "Instalar app · texto", EXTRA, true),
  F("installButton", "Instalar app · botón", EXTRA),
  F("installInstalled", "Instalar app · botón cuando ya está instalada", EXTRA),
  F("installUpdate", "Instalar app · botón cuando hay actualización", EXTRA),
  F("installHelpToggle", "Instalar app · enlace '¿Cómo se instala?'", EXTRA),
  F("installHelpIos", "Instalar app · ayuda en iPhone", EXTRA, true),
  F("installHelpAndroid", "Instalar app · ayuda en Android/ordenador", EXTRA, true),
  F("installIosHint", "Instalar app · ayuda en iPhone", EXTRA, true),
  F("installDismiss", "Instalar app · 'ahora no'", EXTRA),
  F("chatTitle", "Chat · título", EXTRA),
  F("chatIntro", "Chat · texto de bienvenida", EXTRA, true),
  F("chatPlaceholder", "Chat · texto del campo", EXTRA),
  F("chatSend", "Chat · botón enviar", EXTRA),
  F("chatOpenAria", "Chat · abrir (lector de pantalla)", EXTRA),
  F("chatCloseAria", "Chat · cerrar (lector de pantalla)", EXTRA),
  F("chatError", "Chat · error", EXTRA, true),
  F("whatsappFloatAria", "WhatsApp · botón flotante (lector)", EXTRA),
  F("stockAlertTitle", "Aviso de stock · título", EXTRA),
  F("stockAlertIntro", "Aviso de stock · texto", EXTRA, true),
  F("stockAlertEmail", "Aviso de stock · campo email", EXTRA),
  F("stockAlertSubmit", "Aviso de stock · botón", EXTRA),
  F("stockAlertSuccess", "Aviso de stock · confirmación", EXTRA, true),
  F("waitlistTitle", "Lanzamiento · título", EXTRA),
  F("waitlistIntro", "Lanzamiento · texto", EXTRA, true),
  F("waitlistName", "Lanzamiento · campo nombre", EXTRA),
  F("waitlistEmail", "Lanzamiento · campo email", EXTRA),
  F("waitlistPhone", "Lanzamiento · campo teléfono", EXTRA),
  F("waitlistSubmit", "Lanzamiento · botón", EXTRA),
  F("waitlistSuccess", "Lanzamiento · confirmación", EXTRA, true),
  F("waitlistNote", "Lanzamiento · nota de privacidad", EXTRA, true),
  F("checkoutNeedLogin", "Checkout · aviso de ingreso", CART, true),
  F("checkoutConfirm", "Checkout · botón confirmar", CART),
  F("checkoutConfirming", "Checkout · confirmando", CART),
  F("checkoutAddressLabel", "Checkout · campo dirección", CART),
  F("checkoutPhoneLabel", "Checkout · campo teléfono", CART),
  F("checkoutNotesLabel", "Checkout · campo notas", CART),
  F("checkoutPaymentLabel", "Checkout · forma de pago", CART),
  F("checkoutEmptyBody", "Checkout · texto sin productos", CART, true),
  F("checkoutEmptyCta", "Checkout · botón sin productos", CART),

  F("footerAbout", "Pie · frase de la tienda", FOOT, true),
  F("footerStoreHeading", "Pie · título de la columna de enlaces", FOOT),
  F("footerWhatsappLabel", "Pie · rótulo de WhatsApp", FOOT),
  F("footerLegalHeading", "Pie · título de la columna legal", FOOT),
  F("footerLinkTerms", "Pie · enlace Términos", FOOT),
  F("footerLinkPrivacy", "Pie · enlace Privacidad", FOOT),
  F("footerLinkCookies", "Pie · enlace Cookies", FOOT),
  F("footerLinkReservations", "Pie · enlace Reservas y pagos", FOOT),
];

/**
 * Mezcla lo guardado con los valores por defecto: sólo acepta cadenas con
 * contenido real, así un campo vacío nunca rompe la web.
 */
export function resolveSiteTexts(raw: unknown): SiteTexts {
  const base = { ...DEFAULT_SITE_TEXTS } as SiteTexts;
  const parsed = parseJson<unknown>(raw, null);
  if (!parsed || typeof parsed !== "object") return base;
  const obj = parsed as Record<string, unknown>;
  for (const key of Object.keys(DEFAULT_SITE_TEXTS) as SiteTextKey[]) {
    const value = obj[key];
    if (typeof value === "string" && value.trim().length > 0) {
      base[key] = value.trim();
    }
  }
  return base;
}

/** Devuelve sólo las claves conocidas y no vacías, listas para guardar. */
export function sanitizeSiteTexts(raw: unknown): Partial<SiteTexts> {
  const out: Partial<SiteTexts> = {};
  const parsed = parseJson<unknown>(raw, null);
  if (!parsed || typeof parsed !== "object") return out;
  const obj = parsed as Record<string, unknown>;
  for (const key of Object.keys(DEFAULT_SITE_TEXTS) as SiteTextKey[]) {
    const value = obj[key];
    if (typeof value === "string") out[key] = value.trim().slice(0, 400);
  }
  return out;
}
