# SEO de producción — spiegelau.com.pe

## Arquitectura

`products.json` continúa siendo la fuente única. `npm run build` ejecuta Vite y después `scripts/generate-seo.mjs`, que genera en `dist/`:

- una página HTML por producto en `/productos/{slug}/`;
- páginas de las categorías reales en `/catalogo/{categoria}/`;
- índice y páginas de colecciones en `/colecciones/`;
- `sitemap.xml`, `robots.txt`, `404.html` y validación SEO;
- reglas 301 para los IDs antiguos en `.htaccess`.

No se deben editar los HTML generados. Cualquier cambio en el JSON se refleja en el siguiente build.

## Slugs estables

El slug se obtiene de `product.slug` cuando existe; si no, se normaliza `product.name`. Las colisiones reciben el SKU como sufijo. Si un producto publicado cambia de nombre, su URL también cambiará: para conservar autoridad, añade al producto un campo opcional `slug` con el valor anterior antes de cambiar el nombre y conserva ese valor. No es necesario añadir `slug` al resto del catálogo.

## Rutas

- Producto: `/productos/nombre-del-producto/`
- Categoría: `/catalogo/copas/`
- Colecciones: `/colecciones/` y `/colecciones/definition/`
- Ruta antigua: `/catalogo/producto/?id=17`

En Apache/cPanel la ruta antigua tiene un 301 generado. En Vercel estático se sirve la plantilla técnica `noindex` y JavaScript usa `location.replace()` para resolver el ID, ya que una redirección dinámica ID→slug no puede consultar el JSON desde `vercel.json`.

## Despliegue en Vercel

1. Importa el repositorio.
2. Usa `npm run build` y directorio de salida `dist` (Vite suele detectarlo automáticamente).
3. Conecta `spiegelau.com.pe` y configura también la variante `www` para redirigir al dominio principal si se utiliza.
4. No configures un fallback SPA: cada ruta SEO ya tiene su `index.html`.

## Despliegue en cPanel

Sube el contenido completo de `dist/`, incluidos `.htaccess`, `robots.txt`, `sitemap.xml`, carpetas y archivos ocultos. Apache servirá los `index.html`, aplicará trailing slash, HTTPS, dominio canónico, 404 y redirects antiguos.

## Search Console

Después del despliegue:

1. Crea una propiedad de dominio para `spiegelau.com.pe`.
2. Verifica por DNS con el valor que entregue Google.
3. Envía `https://spiegelau.com.pe/sitemap.xml`.
4. Inspecciona Home, catálogo, una categoría, una colección y varios productos.

No se incluye `google-site-verification` porque el valor real solo se obtiene al crear la propiedad. Si Google entrega una etiqueta HTML, colócala dentro del `<head>` de `index.html`; para una propiedad de dominio es preferible verificar mediante DNS.

## SEO local

Si la empresa dispone de ubicación o atención local verificable, puede crear y mantener un Google Business Profile. Esta acción es externa al código y no se han inventado datos de ubicación, reseñas ni certificaciones en los schemas.
