import "./footer.css";

const FOOTER_PRODUCTS_URL = "/src/data/products.json";

function formatFooterCategory(category) {
  return String(category)
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getFooterCategories(products) {
  const categories = new Set();

  products.forEach((product) => {
    if (
      typeof product.category === "string" &&
      product.category.trim() !== ""
    ) {
      categories.add(product.category.trim());
    }
  });

  return [...categories].sort((a, b) =>
    a.localeCompare(b, "es", {
      sensitivity: "base",
    }),
  );
}

function renderFooterCategories(products) {
  const categoryList = document.getElementById(
    "footer-category-list",
  );

  if (!categoryList) {
    return;
  }

  const categories = getFooterCategories(products);

  categoryList.innerHTML = categories
    .map((category) => {
      const categoryUrl = new URL(
        "/catalogo/",
        window.location.origin,
      );

      categoryUrl.searchParams.set(
        "categoria",
        category,
      );

      return `
        <li>
          <a href="${categoryUrl.pathname}${categoryUrl.search}">
            ${formatFooterCategory(category)}
          </a>
        </li>
      `;
    })
    .join("");
}

async function loadFooterCategories() {
  const categoryList = document.getElementById(
    "footer-category-list",
  );

  if (!categoryList) {
    return;
  }

  try {
    const response = await fetch(FOOTER_PRODUCTS_URL);

    if (!response.ok) {
      throw new Error(
        "No se pudieron cargar las categorías del footer.",
      );
    }

    const products = await response.json();

    renderFooterCategories(products);
  } catch (error) {
    console.error(
      "Error al cargar las categorías del footer:",
      error,
    );

    categoryList.innerHTML = `
      <li>
        <a href="/catalogo/">
          Ver productos
        </a>
      </li>
    `;
  }
}

export async function loadFooter() {
  const footerContainer = document.getElementById(
    "footer-container",
  );

  if (!footerContainer) {
    return;
  }

  try {
    const response = await fetch(
      "/src/components/footer/footer.html",
    );

    if (!response.ok) {
      throw new Error(
        "No se pudo cargar footer.html",
      );
    }

    const footerHtml = await response.text();

    footerContainer.innerHTML = footerHtml;

    await loadFooterCategories();
  } catch (error) {
    console.error(
      "Error al cargar el footer:",
      error,
    );
  }
}