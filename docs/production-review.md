# Revisión de producción — 10 de septiembre de 2026

Dominio configurado: https://spiegelau.com.pe

## Validaciones realizadas

- Compilación Vite y generación de 94 fichas de producto y 133 URLs de sitemap.
- Auditoría de HTML generado: títulos, H1, JSON-LD válido, atributos alt y existencia de enlaces y recursos locales.
- Galerías de producto: alt basado en nombre del producto y número de imagen; las imágenes decorativas mantienen alt vacío.
- Banner de delivery alineado con el carrito: gratis desde S/ 300 en Zona 1.
- Contacto y reclamaciones: revisión del código de validación y protección Turnstile; preflight OPTIONS responde 204 y permite el origen https://spiegelau.com.pe.
- Dependencias actualizadas mediante npm audit fix; auditoría sin vulnerabilidades conocidas.

Ejecutar `npm run check:production` para repetir la compilación y la auditoría local.

## Segunda revisión

- Chrome real sin ventana, tamaños 1440x900 y 390x900: inicio, catálogo, nosotros, contacto, preguntas frecuentes, términos y reclamaciones cargaron con un H1 y sin desbordamiento horizontal.
- Agregar producto, abrir selector, seleccionar Zona 2: mostró Por coordinar y cerró el menú en ambos tamaños.
- Corregida la ejecución del manejador antiguo de reclamaciones que anunciaba que el registro digital no estaba habilitado.
- Únicos errores JavaScript observados: Turnstile 110200 (dominio local no autorizado). No confirma ni descarta autorización del dominio final.
- Herramienta Playwright usada temporalmente y retirada con npm ci. scripts/browser-review.mjs requiere Playwright y Chrome para repetir las pruebas.

## Comprobaciones pendientes en el entorno publicado

- Revisión visual final y prueba de buscador y navegación de productos. La prueba automática anterior no cubre todas las interacciones ni todos los tamaños.
- Completar captcha y confirmar recepción de un envío autorizado en ambos formularios. La comprobación OPTIONS no valida el envío ni la entrega del correo.
- Confirmar HTTPS y redirección de www al dominio principal en el proveedor.
- Verificar una URL inexistente con respuesta HTTP 404 y las rutas de productos.
- Registrar sitemap.xml en Search Console y verificar la propiedad mediante DNS.

No se realizó despliegue ni se enviaron formularios reales durante esta revisión. Publicar el contenido de dist según docs/seo-production.md; en Apache incluir .htaccess.
