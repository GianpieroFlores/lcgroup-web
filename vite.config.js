import { resolve } from "node:path";
import { defineConfig } from "vite";

function cleanSeoRoutes() {
  return {
    name: "clean-seo-routes",
    configureServer(server) {
      server.middlewares.use((request, _response, next) => {
        const pathname = new URL(request.url, "http://localhost").pathname;
        if (/^\/productos\/[^/.]+\/?$/.test(pathname)) {
          request.url = "/catalogo/producto/index.html";
        } else if (
          /^\/catalogo\/[^/.]+\/?$/.test(pathname) ||
          /^\/colecciones(?:\/[^/.]+)?\/?$/.test(pathname)
        ) {
          request.url = "/catalogo/index.html";
        }
        next();
      });
    },
  };
}

export default defineConfig({
  base: "/",
  plugins: [cleanSeoRoutes()],
  build: {
    rollupOptions: {
      input: {
        inicio: resolve(import.meta.dirname, "index.html"),
        catalogo: resolve(import.meta.dirname, "catalogo/index.html"),
        producto: resolve(import.meta.dirname, "catalogo/producto/index.html"),
        nosotros: resolve(import.meta.dirname, "nosotros/index.html"),
        contacto: resolve(import.meta.dirname, "contacto/index.html"),
        terminos: resolve(
          import.meta.dirname,
          "terminos-y-condiciones/index.html",
        ),
        preguntas: resolve(
          import.meta.dirname,
          "preguntas-frecuentes/index.html",
        ),
        reclamaciones: resolve(
          import.meta.dirname,
          "libro-de-reclamaciones/index.html",
        ),
      },
    },
  },
});
