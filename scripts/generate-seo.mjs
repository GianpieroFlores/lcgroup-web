import { readFile, writeFile, mkdir, rm, access } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createProductSlug, normalizeSlug } from "../src/utils/product-slugs.js";
import {
  getEffectiveProductPrice,
  getOfferPrice,
  getProductDiscountPercentage,
  getVisibleProducts,
} from "../src/utils/products.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");
const DOMAIN = "https://spiegelau.com.pe";
const allProducts = JSON.parse(await readFile(join(ROOT, "src/data/products.json"), "utf8"));
const products = getVisibleProducts(allProducts);

const htmlEscape = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

const plainText = (value = "") => String(value).replace(/\s+/g, " ").trim();
const truncate = (value, maximum = 158) => {
  const text = plainText(value);
  if (text.length <= maximum) return text;
  return `${text.slice(0, maximum - 1).replace(/\s+\S*$/, "")}…`;
};
const absoluteUrl = (path = "/") => new URL(path, DOMAIN).href;
const jsonLd = (data) => JSON.stringify(data).replaceAll("<", "\\u003c");
const unique = (values) => [...new Set(values.filter(Boolean))];

function replaceElementContent(html, id, content) {
  const pattern = new RegExp(`(<([a-z0-9]+)[^>]*id=["']${id}["'][^>]*>)[\\s\\S]*?(<\\/\\2>)`, "i");
  return html.replace(pattern, `$1${content}$3`);
}

function applyHead(html, seo, schemas = []) {
  let output = html
    .replace(/<title>[\s\S]*?<\/title>/i, "")
    .replace(/<meta\s+name=["']description["'][^>]*\/?\s*>/i, "")
    .replace(/<meta\s+name=["']keywords["'][^>]*\/?\s*>/gi, "")
    .replace(/<link\s+rel=["']canonical["'][^>]*\/?\s*>/gi, "")
    .replace(/<meta\s+(?:property|name)=["'](?:og:|twitter:)[^"']+["'][^>]*\/?\s*>/gi, "")
    .replace(/<meta\s+name=["']robots["'][^>]*\/?\s*>/gi, "")
    .replace(/<script\s+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, "");

  const imageTags = seo.image ? `
    <meta property="og:image" content="${htmlEscape(seo.image)}" />
    <meta property="og:image:alt" content="${htmlEscape(seo.imageAlt || seo.title)}" />
    <meta name="twitter:image" content="${htmlEscape(seo.image)}" />` : "";
  const schemaTags = schemas.map((schema) => `
    <script type="application/ld+json">${jsonLd(schema)}</script>`).join("");
  const tags = `
    <title>${htmlEscape(seo.title)}</title>
    <meta name="description" content="${htmlEscape(seo.description)}" />
    <link rel="canonical" href="${htmlEscape(seo.canonical)}" />
    <meta name="robots" content="${seo.robots || "index,follow,max-image-preview:large"}" />
    <meta property="og:locale" content="es_PE" />
    <meta property="og:type" content="${seo.type || "website"}" />
    <meta property="og:site_name" content="SPIEGELAU Perú" />
    <meta property="og:title" content="${htmlEscape(seo.title)}" />
    <meta property="og:description" content="${htmlEscape(seo.description)}" />
    <meta property="og:url" content="${htmlEscape(seo.canonical)}" />${imageTags}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${htmlEscape(seo.title)}" />
    <meta name="twitter:description" content="${htmlEscape(seo.description)}" />${schemaTags}
  `;
  return output.replace("</head>", `${tags}</head>`);
}

function productImage(product) {
  return product.gallery?.find((item) => item?.image)?.image || "";
}

function productItemMarkup(product) {
  const slug = createProductSlug(product, products);
  const images = product.gallery?.filter((item) => item?.image).map((item) => item.image) || [];
  const primaryImage = images[0] || "";
  const secondaryImage = images[1] || primaryImage;
  const offerPrice = getOfferPrice(product);
  const discountPercentage = getProductDiscountPercentage(product);
  const badges = [
    product.offer
      ? '<span class="catalog-product-badge catalog-product-badge--offer">Oferta</span>'
      : "",
    product.new
      ? '<span class="catalog-product-badge catalog-product-badge--new">Novedad</span>'
      : "",
  ].filter(Boolean).join("");
  const imageMarkup = primaryImage
    ? `<img class="catalog-product-image__primary" src="${htmlEscape(primaryImage)}" alt="${htmlEscape(product.name)}" loading="lazy" width="600" height="600" />
      <img class="catalog-product-image__secondary" src="${htmlEscape(secondaryImage)}" alt="" loading="lazy" width="600" height="600" aria-hidden="true" />`
    : "";
  return `<article class="catalog-product-card" data-product-id="${htmlEscape(product.id)}" data-product-url="/productos/${slug}/" tabindex="0" role="link">
    <div class="catalog-product-image">${badges ? `<div class="catalog-product-badges">${badges}</div>` : ""}${imageMarkup}</div>
    <div class="catalog-product-info">
      <span class="catalog-product-collection">${htmlEscape(product.collection)}</span>
      <h3 class="catalog-product-name"><a href="/productos/${slug}/">${htmlEscape(product.name)}</a></h3>
      <p class="catalog-product-presentation">${htmlEscape(product.presentation)}</p>
      <div class="catalog-product-footer">
        <div class="catalog-product-pricing">${offerPrice === null
          ? `<strong class="catalog-product-price">S/ ${Number(product.price).toFixed(2)}</strong>`
          : `<span class="catalog-product-price catalog-product-price--regular">S/ ${Number(product.price).toFixed(2)}</span><span class="catalog-product-offer-row"><strong class="catalog-product-price catalog-product-price--offer">S/ ${offerPrice.toFixed(2)}</strong><span class="catalog-product-discount">-${discountPercentage}%</span></span>`}
        </div>
        <button class="catalog-cart-button" type="button" aria-label="Agregar ${htmlEscape(product.name)} al carrito"><span class="material-symbols-outlined">shopping_bag</span></button>
      </div>
    </div>
  </article>`;
}

function injectCatalogContent(html, pageProducts, heading, description) {
  let output = html
    .replace(/<h1>[^<]*<\/h1>/i, `<h1>${htmlEscape(heading)}</h1>`)
    .replace(/(<section class="products-hero"[\s\S]*?<h1>[\s\S]*?<\/h1>\s*)<p>[\s\S]*?<\/p>/i, `$1<p>${htmlEscape(description)}</p>`);
  output = replaceElementContent(
    output,
    "catalog-product-grid",
    pageProducts.slice(0, 18).map(productItemMarkup).join(""),
  );
  output = replaceElementContent(
    output,
    "catalog-results-count",
    `Mostrando ${Math.min(pageProducts.length, 18)} de ${pageProducts.length} productos`,
  );
  return output;
}

function productSchemas(product, url, image) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: String(product.sku || product.id),
    description: plainText(product.description || product.shortDescription),
    brand: { "@type": "Brand", name: "Spiegelau" },
    category: product.category,
    url,
  };
  if (image) schema.image = unique(product.gallery.map((item) => item?.image).filter(Boolean).map(absoluteUrl));
  if (getEffectiveProductPrice(product) > 0) {
    schema.offers = {
      "@type": "Offer",
      url,
      priceCurrency: "PEN",
      price: getEffectiveProductPrice(product).toFixed(2),
      availability: Number(product.stock) > 0
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    };
  }
  const categoryUrl = `${DOMAIN}/catalogo/${normalizeSlug(product.category)}/`;
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: `${DOMAIN}/` },
      { "@type": "ListItem", position: 2, name: product.category, item: categoryUrl },
      { "@type": "ListItem", position: 3, name: product.name, item: url },
    ],
  };
  return [schema, breadcrumb];
}

function injectProductContent(html, product) {
  const image = productImage(product);
  const gallery = product.gallery?.filter((item) => item?.image) || [];
  const offerPrice = getOfferPrice(product);
  let output = replaceElementContent(html, "breadcrumb-product", htmlEscape(product.name));
  output = output.replace(/<a href="\/catalogo\/">\s*Cristalería\s*<\/a>/i, `<a href="/catalogo/${normalizeSlug(product.category)}/">${htmlEscape(product.category)}</a>`);
  output = replaceElementContent(output, "product-collection", htmlEscape(product.collection));
  output = replaceElementContent(output, "product-name", htmlEscape(product.name));
  output = replaceElementContent(output, "product-presentation", htmlEscape(product.presentation));
  output = replaceElementContent(output, "product-sku", `SKU: ${htmlEscape(product.sku)}`);
  output = replaceElementContent(
    output,
    "product-price",
    offerPrice === null
      ? (Number(product.price) > 0 ? `S/ ${Number(product.price).toFixed(2)}` : "")
      : `<span class="product-price__regular">S/ ${Number(product.price).toFixed(2)}</span><span class="product-price__offer-row"><strong class="product-price__offer">S/ ${offerPrice.toFixed(2)}</strong><span class="product-price__discount">-${getProductDiscountPercentage(product)}%</span></span>`,
  );
  output = replaceElementContent(output, "product-stock", Number(product.stock) > 0 ? "Stock disponible · sujeto a confirmación" : "Stock agotado");
  output = replaceElementContent(output, "product-short-description", htmlEscape(product.shortDescription));
  output = replaceElementContent(output, "tab-description", plainText(product.description).split("\n").filter(Boolean).map((paragraph) => `<p>${htmlEscape(paragraph)}</p>`).join(""));
  output = replaceElementContent(output, "tab-specifications", (product.specifications || []).map((spec) => `<div class="product-specification-row"><span class="product-specification-label">${htmlEscape(spec.label)}</span><span class="product-specification-value">${htmlEscape(spec.value)}</span></div>`).join(""));
  output = replaceElementContent(output, "product-thumbnails", gallery.map((item, index) => `<button class="product-thumbnail${index === 0 ? " active" : ""}" type="button" data-gallery-index="${index}" aria-label="Mostrar imagen ${index + 1} de ${gallery.length}"><img src="${htmlEscape(item.image)}" alt="${htmlEscape(item.alt || `${product.name} - imagen ${index + 1}`)}" loading="${index === 0 ? "eager" : "lazy"}" width="180" height="180" /></button>`).join(""));
  if (image) {
    output = output.replace(/(<img\s+id="product-image"[\s\S]*?)src=""([\s\S]*?)alt=""/i, `$1src="${htmlEscape(image)}"$2alt="${htmlEscape(gallery[0]?.alt || product.name)}"`);
  }
  const related = products.filter((item) => item.category === product.category && item.id !== product.id).slice(0, 4);
  return replaceElementContent(output, "related-products", related.map(productItemMarkup).join(""));
}

async function writePage(relativePath, html) {
  const destination = join(DIST, relativePath, "index.html");
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, html);
  return destination;
}

const homeTemplate = await readFile(join(DIST, "index.html"), "utf8");
const catalogTemplate = await readFile(join(DIST, "catalogo/index.html"), "utf8");
const productTemplate = await readFile(join(DIST, "catalogo/producto/index.html"), "utf8");
const generatedFiles = [];
const sitemapUrls = [];

const generalPages = [
  {
    file: "index.html", path: "/", title: "Cristalería en Perú | Spiegelau Perú",
    description: "Descubre cristalería premium Spiegelau en Perú: copas, vasos, decantadores y sets para vino, coctelería, restaurantes, hoteles y hogar.",
    image: "/assets/images/Bannerproductos.png",
    schemas: [{ "@context": "https://schema.org", "@type": "Organization", name: "LC Group", url: `${DOMAIN}/`, logo: `${DOMAIN}/assets/images/logo-header.jpg`, brand: { "@type": "Brand", name: "Spiegelau" } }],
  },
  {
    file: "catalogo/index.html", path: "/catalogo/", title: "Comprar cristalería en Perú | Spiegelau",
    description: "Compra cristalería Spiegelau en Perú. Explora copas, vasos, decantadores y sets de cristal para vino, coctelería, hogar y negocios.", image: "/assets/images/Bannerproductos.png",
  },
  { file: "nosotros/index.html", path: "/nosotros/", title: "Nosotros | SPIEGELAU", description: "Conoce a LC Group y nuestra propuesta de cristalería Spiegelau para restaurantes, hoteles, bares, distribuidores y hogares en Perú.", image: "/assets/images/nosotros-presentation.png" },
  { file: "contacto/index.html", path: "/contacto/", title: "Contacto | SPIEGELAU", description: "Contacta con LC Group para recibir asesoría sobre cristalería Spiegelau en Perú para restaurantes, hoteles, bares, distribuidores y hogar.", image: "/assets/images/logo-header.jpg" },
  { file: "preguntas-frecuentes/index.html", path: "/preguntas-frecuentes/", title: "Preguntas frecuentes | SPIEGELAU", description: "Consulta respuestas sobre productos, pedidos, disponibilidad y atención relacionada con la cristalería Spiegelau en Perú." },
  { file: "terminos-y-condiciones/index.html", path: "/terminos-y-condiciones/", title: "Términos y condiciones | SPIEGELAU", description: "Consulta los términos y condiciones aplicables al uso del sitio web y a las solicitudes de productos Spiegelau en Perú." },
  { file: "libro-de-reclamaciones/index.html", path: "/libro-de-reclamaciones/", title: "Libro de Reclamaciones | SPIEGELAU", description: "Accede al Libro de Reclamaciones de LC Group para registrar una solicitud relacionada con nuestra atención y productos." },
];

for (const page of generalPages) {
  const filePath = join(DIST, page.file);
  let html = await readFile(filePath, "utf8");
  if (page.path === "/") {
    html = html.replace(/(<h1[^>]*id="home-hero-title"[^>]*>)[\s\S]*?(<\/h1>)/i, "$1Cristalería Spiegelau en Perú para cada experiencia$2");
  }
  if (page.path === "/catalogo/") {
    html = injectCatalogContent(html, products, "Cristalería Spiegelau", "Explora copas, vasos, decantadores y sets de cristal para cada bebida, ocasión y espacio profesional.");
  }
  html = applyHead(html, {
    title: page.title, description: page.description, canonical: `${DOMAIN}${page.path}`,
    image: page.image ? absoluteUrl(page.image) : "", imageAlt: page.title,
  }, page.schemas || []);
  await writeFile(filePath, html);
  generatedFiles.push(filePath);
  sitemapUrls.push(`${DOMAIN}${page.path}`);
}

const categoryCopy = {
  copas: ["Copas de cristal en Perú | Spiegelau", "Descubre copas de cristal Spiegelau para vino tinto, vino blanco, espumantes y coctelería en hogares y negocios de Perú."],
  vasos: ["Vasos de cristal en Perú | Spiegelau", "Explora vasos de cristal Spiegelau para agua, cerveza, whisky, coctelería y servicio profesional en Perú."],
  decantadores: ["Decantadores de vino en Perú | Spiegelau", "Descubre decantadores Spiegelau diseñados para airear y servir el vino con elegancia en Perú."],
  estuches: ["Estuches de cristalería en Perú | Spiegelau", "Encuentra sets y estuches de cristalería Spiegelau para regalar, equipar el hogar o complementar un servicio profesional en Perú."],
};

for (const category of unique(products.map((product) => product.category))) {
  const slug = normalizeSlug(category);
  const categoryProducts = products.filter((product) => product.category === category);
  const [title, description] = categoryCopy[slug] || [`${category} de cristal | Spiegelau Perú`, `Explora la selección Spiegelau de ${category} disponible en Perú.`];
  const canonical = `${DOMAIN}/catalogo/${slug}/`;
  let html = injectCatalogContent(catalogTemplate, categoryProducts, title.split(" |")[0], description);
  html = applyHead(html, { title, description, canonical, image: absoluteUrl(productImage(categoryProducts[0]) || "/assets/images/Bannerproductos.png"), imageAlt: title }, [{ "@context": "https://schema.org", "@type": "CollectionPage", name: title.split(" |")[0], url: canonical }]);
  generatedFiles.push(await writePage(`catalogo/${slug}`, html));
  sitemapUrls.push(canonical);
}

const collectionGroups = new Map();
for (const product of products) {
  const slug = normalizeSlug(product.collection);
  if (!slug) continue;
  if (!collectionGroups.has(slug)) {
    collectionGroups.set(slug, { name: product.collection, products: [] });
  }
  collectionGroups.get(slug).products.push(product);
}
const collections = [...collectionGroups.keys()];
{
  const title = "Colecciones de cristalería Spiegelau | Perú";
  const description = "Explora las colecciones de cristalería Spiegelau disponibles en Perú y encuentra copas, vasos, decantadores y sets para cada ocasión.";
  let html = injectCatalogContent(catalogTemplate, products, "Colecciones Spiegelau", description);
  html = applyHead(html, { title, description, canonical: `${DOMAIN}/colecciones/`, image: absoluteUrl("/assets/images/Bannerproductos.png"), imageAlt: title }, [{ "@context": "https://schema.org", "@type": "CollectionPage", name: "Colecciones Spiegelau", url: `${DOMAIN}/colecciones/` }]);
  generatedFiles.push(await writePage("colecciones", html));
  sitemapUrls.push(`${DOMAIN}/colecciones/`);
}

for (const slug of collections) {
  const group = collectionGroups.get(slug);
  const collection = group.name;
  const collectionProducts = group.products;
  const title = `Colección ${plainText(collection)} | Spiegelau Perú`;
  const description = truncate(`Descubre la colección ${plainText(collection)} de Spiegelau y sus ${collectionProducts.length} productos de cristalería disponibles para hogares y negocios en Perú.`);
  const canonical = `${DOMAIN}/colecciones/${slug}/`;
  let html = injectCatalogContent(catalogTemplate, collectionProducts, `Colección ${plainText(collection)}`, description);
  html = applyHead(html, { title, description, canonical, image: productImage(collectionProducts[0]) ? absoluteUrl(productImage(collectionProducts[0])) : "", imageAlt: title }, [{ "@context": "https://schema.org", "@type": "CollectionPage", name: `Colección ${plainText(collection)}`, url: canonical }]);
  generatedFiles.push(await writePage(`colecciones/${slug}`, html));
  sitemapUrls.push(canonical);
}

await rm(join(DIST, "productos"), { recursive: true, force: true });
for (const product of products) {
  const slug = createProductSlug(product, products);
  const path = `/productos/${slug}/`;
  const canonical = `${DOMAIN}${path}`;
  const image = productImage(product);
  const description = truncate(product.shortDescription || product.description || `${product.name} de Spiegelau.`);
  let html = injectProductContent(productTemplate, product);
  html = applyHead(html, {
    title: `${plainText(product.name)} | SPIEGELAU`, description, canonical,
    type: "product", image: image ? absoluteUrl(image) : "",
    imageAlt: product.gallery?.[0]?.alt || product.name,
  }, productSchemas(product, canonical, image));
  generatedFiles.push(await writePage(`productos/${slug}`, html));
  sitemapUrls.push(canonical);
}

let legacy = await readFile(join(DIST, "catalogo/producto/index.html"), "utf8");
legacy = applyHead(legacy, {
  title: "Redirección de producto | SPIEGELAU",
  description: "Redirección a la ficha actual del producto Spiegelau.",
  canonical: `${DOMAIN}/catalogo/`, robots: "noindex,follow",
});
await writeFile(join(DIST, "catalogo/producto/index.html"), legacy);

const notFound = `<!doctype html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Página no encontrada | SPIEGELAU</title><meta name="description" content="La página solicitada no existe."><meta name="robots" content="noindex,follow"><link rel="canonical" href="${DOMAIN}/404.html"></head><body><main><h1>Página no encontrada</h1><p>La dirección solicitada no existe o ya no está disponible.</p><p><a href="/catalogo/">Explorar el catálogo</a></p></main></body></html>`;
await writeFile(join(DIST, "404.html"), notFound);

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${unique(sitemapUrls).map((url) => `  <url><loc>${htmlEscape(url)}</loc></url>`).join("\n")}\n</urlset>\n`;
await writeFile(join(DIST, "sitemap.xml"), sitemap);

const apacheConfigPath = join(DIST, ".htaccess");
let apacheConfig = await readFile(apacheConfigPath, "utf8");
const legacyProductRedirects = products.map((product) => {
  const slug = createProductSlug(product, products);
  return `  RewriteCond %{QUERY_STRING} (^|&)id=${String(product.id).replace(/[^0-9]/g, "")}(&|$)\n  RewriteRule ^catalogo/producto/?$ /productos/${slug}/ [R=301,L,NE,QSD]`;
}).join("\n\n");
apacheConfig = apacheConfig.replace("</IfModule>", `\n  # Redirecciones permanentes generadas desde products.json.\n${legacyProductRedirects}\n</IfModule>`);
await writeFile(apacheConfigPath, apacheConfig);

async function validateGeneratedSeo() {
  const errors = [];
  const slugs = products.map((product) => createProductSlug(product, products));
  if (new Set(slugs).size !== slugs.length) errors.push("Existen slugs de producto duplicados.");
  if (new Set(sitemapUrls).size !== sitemapUrls.length) errors.push("Existen URLs duplicadas en el sitemap.");

  const canonicals = new Set();
  for (const file of generatedFiles) {
    const html = await readFile(file, "utf8");
    const title = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim();
    const description = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i)?.[1]?.trim();
    const canonical = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)?.[1];
    if (!title) errors.push(`Título vacío: ${file}`);
    if (!description) errors.push(`Description vacía: ${file}`);
    if (!canonical) errors.push(`Canonical ausente: ${file}`);
    if (canonical && canonicals.has(canonical)) errors.push(`Canonical duplicado: ${canonical}`);
    if (canonical) canonicals.add(canonical);
    if (/href=["'][^"']*\?id=/i.test(html)) errors.push(`Enlace antiguo ?id=: ${file}`);
    if (/https?:\/\/(?:localhost|[^/]*vercel\.app|lcgroup\.com\.pe)/i.test(canonical || "")) errors.push(`Dominio inválido en canonical: ${file}`);

    const ogImage = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i)?.[1];
    if (ogImage) {
      const pathname = new URL(ogImage).pathname.replace(/^\//, "");
      try { await access(join(DIST, pathname)); } catch { errors.push(`OG image inexistente: ${ogImage}`); }
    }
  }

  for (const [index, product] of products.entries()) {
    const file = join(DIST, "productos", slugs[index], "index.html");
    const html = await readFile(file, "utf8");
    if (!/<h1[^>]*id="product-name"[^>]*>[^<]+<\/h1>/i.test(html)) errors.push(`Producto sin H1: ${product.id}`);
    if (!/"@type":"Product"/.test(html)) errors.push(`Producto sin Schema Product: ${product.id}`);
    if (!/<link\s+rel="canonical"/i.test(html)) errors.push(`Producto sin canonical: ${product.id}`);
  }

  if (errors.length) throw new Error(`Validación SEO fallida:\n- ${errors.join("\n- ")}`);
  const report = {
    domain: DOMAIN,
    products: products.length,
    categories: unique(products.map((product) => product.category)).length,
    collections: collections.length,
    sitemapUrls: unique(sitemapUrls).length,
    productsWithoutPriceOffer: products.filter((product) => !(Number(product.price) > 0)).length,
    productsWithoutOgImage: products.filter((product) => !productImage(product)).length,
    status: "ok",
  };
  await writeFile(join(DIST, "seo-validation.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`SEO generado y validado: ${report.products} productos, ${report.sitemapUrls} URLs.`);
}

await validateGeneratedSeo();
