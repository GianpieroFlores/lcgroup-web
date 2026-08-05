const MEASUREMENT_ID = "G-SQMS3V5EBQ";

export const ANALYTICS_ENABLED = true;
export const TRACK_LOCALHOST = true;
export const ANALYTICS_DEBUG = false;

const SAFE_QUERY_PARAMETERS = new Set([
  "id", "categoria", "coleccion", "bebida", "seleccion", "vista", "pagina",
]);
const trackedSections = new WeakSet();
const trackedProductViews = new Set();
const trackedLists = new Set();
const scrollMilestones = new Set();
const recentSearches = new Map();
let analyticsInitialized = false;
let pageViewTracked = false;
let globalTrackingInitialized = false;
let sectionObserver = null;

const SECTION_NAMES = {
  header: "Encabezado", footer: "Pie de página", hero: "Banner principal",
  categories: "Categorías", featured_products: "Productos destacados",
  catalog_hero: "Encabezado del catálogo", catalog_results: "Resultados del catálogo",
  product_detail: "Detalle del producto", product_information: "Información del producto",
  related_products: "Productos relacionados", contact_hero: "Encabezado de contacto",
  contact: "Contacto", location_map: "Ubicación", about_hero: "Nosotros",
  about_presentation: "Presentación", authorized_partnership: "Distribuidor autorizado",
  company_values: "Valores de la empresa", terms_hero: "Términos y condiciones",
  terms_content: "Contenido de términos y condiciones", faq_hero: "Preguntas frecuentes",
  faq_content: "Contenido de preguntas frecuentes", claims_hero: "Libro de reclamaciones",
  claims_content: "Contenido del libro de reclamaciones",
};

function canTrack() {
  return ANALYTICS_ENABLED &&
    (TRACK_LOCALHOST || !["localhost", "127.0.0.1"].includes(location.hostname));
}

function cleanText(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function friendlyValue(value) {
  const text = cleanText(value).replace(/[-_]+/g, " ");
  return text ? text.charAt(0).toLocaleUpperCase("es") + text.slice(1).toLocaleLowerCase("es") : "";
}

function safePagePath() {
  const params = new URLSearchParams();
  new URLSearchParams(window.location.search).forEach((value, key) => {
    if (SAFE_QUERY_PARAMETERS.has(key)) params.append(key, value);
  });
  const query = params.toString();
  return `${window.location.pathname}${query ? `?${query}` : ""}`;
}

function pageName() {
  const path = window.location.pathname.replace(/index\.html$/, "");
  if (path.includes("/catalogo/producto/")) return "Detalle de producto";
  if (path.includes("/catalogo/")) {
    return new URLSearchParams(window.location.search).get("vista") === "colecciones"
      ? "Colecciones" : "Catálogo";
  }
  if (path.includes("/nosotros/")) return "Nosotros";
  if (path.includes("/contacto/")) return "Contacto";
  if (path.includes("/preguntas-frecuentes/")) return "Preguntas frecuentes";
  if (path.includes("/libro-de-reclamaciones/")) return "Libro de reclamaciones";
  if (path.includes("/terminos-y-condiciones/")) return "Términos y condiciones";
  return "Inicio";
}

function pageContext() {
  return { page_name: pageName(), page_path: safePagePath() };
}

function debugParameters() {
  return ANALYTICS_DEBUG ? { debug_mode: true } : {};
}

function cleanValue(value) {
  if (value === undefined || value === null || value === "") return undefined;
  if (Array.isArray(value)) return value.map(cleanValue).filter((item) => item !== undefined);
  if (typeof value === "object") {
    return Object.fromEntries(Object.entries(value)
      .map(([key, item]) => [key, cleanValue(item)])
      .filter(([, item]) => item !== undefined));
  }
  return value;
}

function safeDestinationUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(value, window.location.href);
    if (["wa.me", "api.whatsapp.com", "web.whatsapp.com"].includes(url.hostname)) {
      return `${url.origin}${url.pathname}`;
    }
    const params = new URLSearchParams();
    url.searchParams.forEach((item, key) => {
      if (SAFE_QUERY_PARAMETERS.has(key)) params.append(key, item);
    });
    return `${url.origin}${url.pathname}${params.size ? `?${params}` : ""}`;
  } catch {
    return String(value).split("?")[0];
  }
}

function sendManualPageView() {
  if (pageViewTracked) return;
  pageViewTracked = true;
  const context = pageContext();
  window.gtag("config", MEASUREMENT_ID, {
    ...context, page_title: document.title, send_page_view: false, ...debugParameters(),
  });
  trackEvent("page_view", {
    ...context, page_location: `${window.location.origin}${context.page_path}`,
    page_title: document.title,
  });
}

export function initAnalytics() {
  if (!canTrack() || analyticsInitialized) return;
  analyticsInitialized = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
  try {
    window.gtag("js", new Date());
    window.gtag("config", MEASUREMENT_ID, {
      ...pageContext(), page_title: document.title, send_page_view: false, ...debugParameters(),
    });
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", sendManualPageView, { once: true });
    } else {
      queueMicrotask(sendManualPageView);
    }
    if (!document.querySelector(`script[data-ga4-id="${MEASUREMENT_ID}"]`)) {
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
      script.dataset.ga4Id = MEASUREMENT_ID;
      script.addEventListener("error", () => {});
      document.head.append(script);
    }
  } catch {}
}

export function trackEvent(eventName, parameters = {}) {
  if (!canTrack() || typeof window.gtag !== "function" || !eventName) return;
  try { window.gtag("event", eventName, cleanValue({ ...pageContext(), ...parameters, ...debugParameters() })); } catch {}
}

export function createAnalyticsItem(product, index, quantity) {
  if (!product) return null;
  const itemName = cleanText(product.name) || "Producto";
  const itemBrand = cleanText(product.brand) || (/spiegelau/i.test(itemName) ? "SPIEGELAU" : "");
  return cleanValue({
    item_id: String(product.sku || product.id || ""),
    item_name: itemName,
    item_brand: itemBrand,
    item_category: friendlyValue(product.category),
    item_category2: friendlyValue(product.collection),
    item_variant: cleanText(product.presentation),
    price: Number(product.price) || 0,
    index,
    quantity,
  });
}

export function trackSectionView(sectionName, extraData = {}) {
  trackEvent("section_view", { section_name: SECTION_NAMES[sectionName] || friendlyValue(sectionName), ...extraData });
}

function observeSections(root = document) {
  if (!sectionObserver) return;
  root.querySelectorAll?.("[data-analytics-section]").forEach((section) => {
    if (!trackedSections.has(section)) sectionObserver.observe(section);
  });
}

export function initSectionTracking() {
  if (!canTrack() || sectionObserver || !("IntersectionObserver" in window)) return;
  sectionObserver = new IntersectionObserver((entries) => entries.forEach((entry) => {
    const requiredHeight = Math.min(entry.boundingClientRect.height, innerHeight) * 0.5;
    if (!entry.isIntersecting || entry.intersectionRect.height < requiredHeight || trackedSections.has(entry.target)) return;
    trackedSections.add(entry.target);
    sectionObserver.unobserve(entry.target);
    trackSectionView(entry.target.dataset.analyticsSection);
  }), { threshold: [0, 0.25, 0.5] });
  observeSections();
  new MutationObserver((mutations) => mutations.forEach((mutation) => mutation.addedNodes.forEach((node) => {
    if (node instanceof Element) {
      if (node.matches("[data-analytics-section]")) sectionObserver.observe(node);
      observeSections(node);
    }
  }))).observe(document.body, { childList: true, subtree: true });
}

export function initScrollTracking() {
  if (!canTrack()) return;
  const onScroll = () => {
    const scrollable = document.documentElement.scrollHeight - innerHeight;
    if (scrollable <= 0) return;
    const percent = (scrollY / scrollable) * 100;
    [25, 50, 75, 90].forEach((milestone) => {
      if (percent >= milestone && !scrollMilestones.has(milestone)) {
        scrollMilestones.add(milestone);
        trackEvent("scroll_depth", { percent_scrolled: milestone });
      }
    });
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

const WHATSAPP_SOURCES = {
  cart: "Carrito", floating_button: "Botón flotante", footer: "Pie de página",
  header: "Encabezado", contact_page: "Página de contacto",
  product_detail: "Detalle de producto", banner: "Banner", page: "Página",
};

export function initGlobalClickTracking() {
  if (globalTrackingInitialized) return;
  globalTrackingInitialized = true;
  document.addEventListener("click", (event) => {
    const whatsappLink = event.target.closest?.('a[href*="wa.me"], a[href*="api.whatsapp.com"], a[href*="web.whatsapp.com"]');
    if (whatsappLink && whatsappLink.id !== "cart-whatsapp-button") {
      const source = whatsappLink.classList.contains("whatsapp-float") ? "floating_button"
        : whatsappLink.closest(".footer") ? "footer"
          : whatsappLink.closest(".contact-page") ? "contact_page"
            : whatsappLink.closest(".product-page") ? "product_detail" : "page";
      trackWhatsappClick(source, {
        button_name: cleanText(whatsappLink.textContent) || whatsappLink.getAttribute("aria-label"),
        link_url: whatsappLink.href,
      });
    }
    const element = event.target.closest?.("[data-analytics-event]") ||
      event.target.closest?.(".nav a, .mobile-menu-panel a, .footer-column a, .logo a");
    if (!element) return;
    const eventName = element.dataset.analyticsEvent || "button_click";
    const base = {
      button_name: cleanText(element.dataset.analyticsName || element.textContent).slice(0, 100),
      button_text: cleanText(element.textContent).slice(0, 100),
      link_url: safeDestinationUrl(element.href || element.dataset.productUrl),
      section_name: SECTION_NAMES[element.closest("[data-analytics-section]")?.dataset.analyticsSection] || undefined,
    };
    if (eventName === "collection_click") base.collection_name = friendlyValue(element.dataset.analyticsValue);
    if (eventName === "category_click") base.category_name = friendlyValue(element.dataset.analyticsValue);
    if (eventName === "drink_type_click") base.drink_type = friendlyValue(element.dataset.analyticsValue);
    trackEvent(eventName, base);
  });
}

export function initGlobalAnalytics() {
  initAnalytics(); initSectionTracking(); initScrollTracking(); initGlobalClickTracking();
}

export function trackSearch(term, resultsCount, source = "site") {
  const searchTerm = cleanText(term).toLocaleLowerCase("es");
  if (!searchTerm) return;
  const signature = `${source}:${searchTerm}:${resultsCount}`;
  const now = Date.now();
  if (now - (recentSearches.get(signature) || 0) < 1500) return;
  recentSearches.set(signature, now);
  trackEvent("search", {
    search_term: searchTerm, results_count: Number(resultsCount) || 0,
    search_source: source === "header" ? "Encabezado" : friendlyValue(source),
  });
  if (Number(resultsCount) === 0) trackEvent("search_no_results", { search_term: searchTerm, results_count: 0 });
}

const FILTER_TYPES = {
  selection: "Destacados", seleccion: "Destacados", category: "Categoría",
  categoria: "Categoría", collection: "Colección", coleccion: "Colección",
  drink: "Tipo de bebida", drink_type: "Tipo de bebida", bebida: "Tipo de bebida",
  price: "Precio", precio: "Precio", brand: "Marca", marca: "Marca",
};

export function trackFilter(filterType, filterValue, resultsCount, source = "user") {
  trackEvent("filter_apply", {
    filter_type: FILTER_TYPES[filterType] || friendlyValue(filterType),
    filter_value: friendlyValue(filterValue), results_count: Number(resultsCount) || 0,
    filter_source: source === "user" ? "Usuario" : source === "url" ? "URL" : friendlyValue(source),
  });
}

const SORT_NAMES = {
  default: "Recomendados", "price-asc": "Precio: menor a mayor",
  "price-desc": "Precio: mayor a menor", "name-asc": "Nombre: A a Z",
  "name-desc": "Nombre: Z a A", featured: "Destacados", newest: "Más recientes",
};

export function trackSort(sortValue, resultsCount) {
  trackEvent("sort_apply", {
    sort_value: SORT_NAMES[sortValue] || friendlyValue(sortValue),
    results_count: Number(resultsCount) || 0,
  });
}

export function trackViewItemList(container, products, listId, listName, searchTerm = "") {
  if (!container || !products?.length) return;
  const items = products.map((product, index) => createAnalyticsItem(product, index + 1));
  const signature = `${safePagePath()}:${listId}:${items.map((item) => item.item_id).join(",")}`;
  container.querySelectorAll(".catalog-product-card").forEach((card, index) => {
    card.dataset.analyticsListId = listId;
    card.dataset.analyticsListName = listName;
    card.dataset.analyticsIndex = String(index + 1);
    if (searchTerm) card.dataset.analyticsSearchTerm = searchTerm;
  });
  if (trackedLists.has(signature)) return;
  trackedLists.add(signature);
  trackEvent("view_item_list", {
    currency: "PEN", item_list_id: listId, item_list_name: cleanText(listName),
    items,
  });
}

export function trackSelectItem(product, context = {}) {
  const item = createAnalyticsItem(product, Number(context.index) || 1);
  if (!item) return;
  const listName = cleanText(context.listName) || "Productos";
  trackEvent("select_item", {
    currency: "PEN", item_list_id: context.listId || "product_list",
    item_list_name: listName,
    items: [item],
  });
}

export function trackViewItem(product) {
  const item = createAnalyticsItem(product);
  const key = `${safePagePath()}:${item?.item_id}`;
  if (!item || trackedProductViews.has(key)) return;
  trackedProductViews.add(key);
  trackEvent("view_item", { currency: "PEN", value: item.price, items: [item] });
}

function trackCartEvent(name, product, quantity, context = {}) {
  const item = createAnalyticsItem(product, undefined, quantity);
  if (!item) return;
  trackEvent(name, {
    currency: "PEN", value: item.price * quantity,
    removal_type: context.removal_type,
    items: [item],
  });
}

export const trackAddToCart = (product, quantity = 1, context = {}) =>
  trackCartEvent("add_to_cart", product, quantity, context);
export const trackRemoveFromCart = (product, quantity = 1, context = {}) =>
  trackCartEvent("remove_from_cart", product, quantity, context);

export function trackViewCart(items, value) {
  trackEvent("view_cart", {
    currency: "PEN", value: Number(value) || 0,
    items: items.map((item) => createAnalyticsItem(item, undefined, item.quantity)),
  });
}

export function trackBeginCheckout(items, value) {
  trackEvent("begin_checkout", {
    currency: "PEN", value: Number(value) || 0,
    items: items.map((item) => createAnalyticsItem(item, undefined, item.quantity)),
  });
}

export function trackWhatsappClick(source, data = {}) {
  trackEvent("whatsapp_click", {
    whatsapp_source: WHATSAPP_SOURCES[source] || friendlyValue(source), ...data,
    link_url: safeDestinationUrl(data.link_url),
  });
}

export function trackProductNotFound(requestedId) {
  trackEvent("product_not_found", { requested_product_id: String(requestedId || "") });
}
