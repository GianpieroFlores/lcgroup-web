import "./animations.css";

const MOTION_VISIBLE_CLASS = "is-motion-visible";
const MOTION_REVEAL_CLASS = "motion-reveal";

const TEXT_ITEM_SELECTOR = [
  ":scope > .home-eyebrow",
  ":scope > .home-categories__eyebrow",
  ":scope > .about-eyebrow",
  ":scope > .section-label",
  ":scope > .product-brand",
  ":scope > h1",
  ":scope > h2",
  ":scope > p",
  ":scope > .product-variant",
  ":scope > .product-sku",
  ":scope > .product-price",
  ":scope > .product-stock",
  ":scope > .home-hero__actions > .button",
  ":scope > .products-breadcrumb",
  ":scope > .home-link",
  ":scope > .home-categories__link",
  ":scope > .featured-showcase__button",
  ":scope > .about-link",
  ":scope > .about-final__actions",
  ":scope > .product-actions",
  ":scope > .contact-form",
  ":scope > .catalog-toolbar-left",
  ":scope > .catalog-toolbar-right",
].join(",");

const REVEAL_GROUPS = [
  {
    selector: ".home-hero__content",
    variant: "motion-hero-left",
  },
  {
    selector: ".home-categories__intro",
    variant: "motion-section-left",
  },
  {
    selector: ".home-featured-products__heading",
    variant: "motion-section-left",
  },
  {
    selector: ".home-featured-products__description",
    variant: "motion-section-right",
  },
  {
    selector: ".featured-showcase__content",
    variant: "motion-section-left",
  },
  {
    selector: ".featured-showcase__drinks-header",
    variant: "motion-section-left",
  },
  {
    selector: ".products-hero-content",
    variant: "motion-hero-left",
    children: TEXT_ITEM_SELECTOR,
    stagger: 85,
  },
  {
    selector: ".product-information",
    variant: "motion-section-right",
  },
  {
    selector: ".related-products .section-header",
    variant: "motion-card-up",
  },
  {
    selector: ".about-intro__content",
    variant: "motion-section-right",
  },
  {
    selector: ".about-presentation__content",
    variant: "motion-section-left",
  },
  {
    selector:
      ".about-categories > .about-section-heading, .about-values > .about-section-heading, .about-service > .about-section-heading",
    variant: "motion-card-up",
  },
  {
    selector: ".about-quality__content",
    variant: "motion-section-right",
  },
  {
    selector: ".about-final__content",
    variant: "motion-section-left",
  },
  {
    selector: ".contact-hero .container",
    variant: "motion-hero-left",
    children: TEXT_ITEM_SELECTOR,
    stagger: 85,
  },
  {
    selector: ".contact-form-wrapper",
    variant: "motion-card-up",
  },
  {
    selector: ".map-header > .section-label",
    variant: "motion-section-left",
  },
  {
    selector: ".map-header > h2, .map-header > p",
    variant: "motion-section-right",
  },
  {
    selector: ".footer",
    variant: "motion-footer",
  },
];

const MEDIA_GROUPS = [
  {
    selector: ".home-hero__video",
    variant: "motion-image-scale",
  },
  {
    selector: ".featured-showcase__image",
    variant: "motion-image-up",
  },
  {
    selector: ".product-gallery",
    variant: "motion-image-scale",
  },
  {
    selector: ".map-wrapper",
    variant: "motion-image-up",
  },
];

const INTERACTIVE_SELECTOR = [
  ".home-page .button",
  ".featured-showcase__button",
  ".about-link",
  ".about-page .button",
  ".product-cart-button",
  ".catalog-filter-button",
  ".catalog-empty-state button",
  ".contact-form .btn-primary",
].join(",");

const STAGGER_GROUPS = [
  {
    container: ".motion-stagger",
    items: ":scope > *",
  },
  {
    container: ".home-categories",
    items: ".home-category-card",
    variant: "motion-card-up",
  },
  {
    container: ".home-featured-products__track",
    items: ".catalog-product-card",
    variant: "motion-product-card",
  },
  {
    container: ".featured-showcase__links",
    items: ":scope > a, :scope > button",
    variant: "motion-card-up",
  },
  {
    container: ".catalog-product-grid",
    items: ".catalog-product-card",
    variant: "motion-product-card",
  },
  {
    container: ".related-products-grid",
    items: ".catalog-product-card",
    variant: "motion-product-card",
  },
  {
    container: ".about-categories__grid",
    items: ".about-category-card",
    variant: "motion-card-up",
  },
  {
    container: ".about-values__grid",
    items: ".about-value-card",
    variant: "motion-card-up",
  },
  {
    container: ".about-brands__logos",
    items: ".about-brand",
    variant: "motion-card-up",
  },
  {
    container: ".about-service__grid",
    items: ".about-service-card",
    variant: "motion-card-up",
  },
  {
    container: ".contact-info",
    items: ".info-card",
    variant: "motion-card-up",
  },
];

const HEADER_LOAD_ITEMS = [
  { selector: ".header .logo", delay: 0 },
  { selector: ".header .nav", delay: 90 },
  { selector: ".header .search", delay: 140 },
  { selector: ".header .header-cart-button", delay: 190 },
  { selector: ".header .mobile-menu-toggle", delay: 190 },
];

let intersectionObserver = null;
let mutationObserver = null;
let animationsInitialized = false;
const pendingObservations = new WeakSet();

const reducedMotionQuery = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
);

function queryIncludingRoot(root, selector) {
  const elements = [];

  if (root instanceof Element && root.matches(selector)) {
    elements.push(root);
  }

  if (
    root instanceof Document ||
    root instanceof DocumentFragment ||
    root instanceof Element
  ) {
    elements.push(...root.querySelectorAll(selector));
  }

  return elements;
}

function revealElement(element) {
  if (
    !reducedMotionQuery.matches &&
    !element.classList.contains(MOTION_VISIBLE_CLASS)
  ) {
    element.classList.add("is-motion-animating");

    const handleRevealEnd = (event) => {
      if (
        event.target !== element ||
        event.animationName !== "motion-reveal-in"
      ) {
        return;
      }

      element.classList.remove("is-motion-animating");
      element.removeEventListener(
        "animationend",
        handleRevealEnd,
      );
    };

    element.addEventListener(
      "animationend",
      handleRevealEnd,
    );
  }

  element.classList.add(MOTION_VISIBLE_CLASS);
  intersectionObserver?.unobserve(element);
}

function afterInitialPaint(element, callback) {
  requestAnimationFrame(() => {
    /*
     * Fuerza al navegador a calcular el estado inicial oculto antes
     * de programar la revelación en el siguiente frame.
     */
    getComputedStyle(element).opacity;

    requestAnimationFrame(callback);
  });
}

function observeElement(element) {
  if (reducedMotionQuery.matches || !intersectionObserver) {
    revealElement(element);
    return;
  }

  if (pendingObservations.has(element)) {
    return;
  }

  pendingObservations.add(element);

  afterInitialPaint(element, () => {
    pendingObservations.delete(element);

    if (!element.isConnected) {
      return;
    }

    if (reducedMotionQuery.matches || !intersectionObserver) {
      revealElement(element);
      return;
    }

    intersectionObserver.observe(element);
  });
}

function addReveal(element, variant = "motion-fade-up", delay = 0) {
  if (
    !(element instanceof HTMLElement) ||
    element.classList.contains(MOTION_REVEAL_CLASS)
  ) {
    return;
  }

  element.classList.add(MOTION_REVEAL_CLASS, variant);
  element.style.setProperty("--motion-delay", `${delay}ms`);

  observeElement(element);
}

function prepareRevealGroups(root) {
  REVEAL_GROUPS.forEach((groupDefinition) => {
    queryIncludingRoot(root, groupDefinition.selector).forEach((element) => {
      if (!groupDefinition.children) {
        addReveal(element, groupDefinition.variant);
        return;
      }

      element
        .querySelectorAll(groupDefinition.children)
        .forEach((child, index) => {
          addReveal(
            child,
            groupDefinition.variant,
            Math.min(index, 6) * groupDefinition.stagger,
          );
        });
    });
  });
}

function prepareMedia(root) {
  MEDIA_GROUPS.forEach((groupDefinition) => {
    queryIncludingRoot(root, groupDefinition.selector).forEach((media) => {
      addReveal(media, groupDefinition.variant, 60);
    });
  });
}

function prepareStaggerGroups(root) {
  STAGGER_GROUPS.forEach((groupDefinition) => {
    queryIncludingRoot(root, groupDefinition.container).forEach((container) => {
      const items = Array.from(
        container.querySelectorAll(groupDefinition.items),
      );

      items.forEach((item, index) => {
        addReveal(
          item,
          groupDefinition.variant || "motion-card-up",
          Math.min(index, 6) * 70,
        );
      });
    });
  });
}

function prepareInteractions(root) {
  queryIncludingRoot(root, INTERACTIVE_SELECTOR).forEach((element) => {
    element.classList.add("motion-interactive");
  });
}

function prepareDeclaredReveals(root) {
  queryIncludingRoot(root, `.${MOTION_REVEAL_CLASS}`).forEach((element) => {
    if (!element.classList.contains(MOTION_VISIBLE_CLASS)) {
      observeElement(element);
    }
  });
}

function prepareHeaderLoad(root) {
  HEADER_LOAD_ITEMS.forEach(({ selector, delay }) => {
    queryIncludingRoot(root, selector).forEach((element) => {
      if (element.classList.contains("motion-load")) {
        return;
      }

      element.classList.add("motion-load", "motion-load-from-top");
      element.style.setProperty("--motion-delay", `${delay}ms`);

      if (reducedMotionQuery.matches) {
        element.classList.add(MOTION_VISIBLE_CLASS);
        return;
      }

      afterInitialPaint(element, () => {
        revealElement(element);
      });
    });
  });
}

export function refreshAnimations(root = document) {
  prepareRevealGroups(root);
  prepareMedia(root);
  prepareStaggerGroups(root);
  prepareInteractions(root);
  prepareHeaderLoad(root);
  prepareDeclaredReveals(root);
}

function createIntersectionObserver() {
  if (!("IntersectionObserver" in window)) {
    document.querySelectorAll(`.${MOTION_REVEAL_CLASS}`).forEach(revealElement);

    return null;
  }

  return new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          revealElement(entry.target);
        }
      });
    },
    {
      root: null,
      rootMargin: "0px 0px -8% 0px",
      threshold: 0.08,
    },
  );
}

function createMutationObserver() {
  if (!("MutationObserver" in window)) {
    return null;
  }

  return new MutationObserver((records) => {
    const roots = new Set();

    records.forEach((record) => {
      if (record.target instanceof Element) {
        roots.add(record.target);
      }

      record.addedNodes.forEach((node) => {
        if (node instanceof Element) {
          roots.add(node);
        }
      });
    });

    roots.forEach(refreshAnimations);
  });
}

function handleReducedMotionChange() {
  if (!reducedMotionQuery.matches) {
    intersectionObserver ??= createIntersectionObserver();
    return;
  }

  intersectionObserver?.disconnect();
  intersectionObserver = null;

  document.querySelectorAll(`.${MOTION_REVEAL_CLASS}`).forEach(revealElement);
}

export function initAnimations() {
  if (animationsInitialized) {
    refreshAnimations();
    return;
  }

  animationsInitialized = true;

  intersectionObserver = reducedMotionQuery.matches
    ? null
    : createIntersectionObserver();

  /*
   * Primero se activa el estado inicial oculto.
   */
  document.documentElement.classList.add("motion-ready");

  /*
   * Después se preparan los elementos, pero todavía no se revelan.
   */
  refreshAnimations();

  /*
   * MutationObserver para elementos generados dinámicamente.
   */
  mutationObserver = createMutationObserver();

  mutationObserver?.observe(document.body, {
    childList: true,
    subtree: true,
  });

  reducedMotionQuery.addEventListener(
    "change",
    handleReducedMotionChange,
  );
}
