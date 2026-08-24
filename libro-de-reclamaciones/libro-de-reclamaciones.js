import "../src/pages/information-pages.js";

// =====================================================
// CONFIGURACIÓN
// =====================================================

const WORKER_URL =
  "https://spiegelau-reclamos-api.spiegelauweb.workers.dev";

const form = document.querySelector("[data-claim-form]");
const submitButton = form?.querySelector('[type="submit"]');
const status = document.querySelector("[data-claim-status]");

const SUBMIT_BUTTON_TEXT = "Enviar hoja de reclamación";

const NOTICE_ICONS = {
  success: "check_circle",
  warning: "warning",
  error: "error",
  info: "info",
};

let isSubmitting = false;
let noticeTimer = null;
let noticeRemovalTimer = null;
let noticeReturnFocus = null;

const validatedFields = new Set();

// =====================================================
// PATRONES
// =====================================================

const NAME_PATTERN =
  /^(?=.*\p{L})[\p{L}\p{M}\s.'’\-]+$/u;

const DOCUMENT_PATTERN =
  /^[A-Za-z0-9.\-]+$/;

const PHONE_PATTERN =
  /^[0-9+\s()\-]+$/;

const EMAIL_PATTERN =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const URL_PATTERN =
  /(?:https?:\/\/|www\.|(?:[a-z0-9-]+\.)+(?:com|net|org|pe|io|co)(?:[/?#]|\b))/i;

const UNSAFE_SHORT_FIELD_PATTERN =
  /(?:<\s*\/?\s*script|javascript\s*:|data\s*:\s*text\/html|[<>])/i;

// =====================================================
// NOTIFICACIÓN GENERAL
// Similar a la del formulario de contacto
// =====================================================

function getClaimNotice() {
  let notice = document.querySelector(".claim-notice");

  if (notice) return notice;

  notice = document.createElement("div");

  notice.className = "claim-notice";
  notice.hidden = true;
  notice.setAttribute("aria-atomic", "true");
  notice.setAttribute("aria-modal", "true");

  notice.innerHTML = `
    <div class="claim-notice__panel">
      <span
        class="claim-notice__icon material-symbols-outlined"
        aria-hidden="true"
      ></span>

      <div class="claim-notice__content">
        <strong
          class="claim-notice__title"
          id="claim-notice-title"
        ></strong>

        <p
          class="claim-notice__message"
          id="claim-notice-message"
        ></p>

        <button
          class="claim-notice__action"
          type="button"
        >
          Entendido
        </button>
      </div>

      <button
        class="claim-notice__close"
        type="button"
        aria-label="Cerrar notificación"
      >
        <span
          class="material-symbols-outlined"
          aria-hidden="true"
        >
          close
        </span>
      </button>
    </div>
  `;

  notice.setAttribute(
    "aria-labelledby",
    "claim-notice-title",
  );

  notice.setAttribute(
    "aria-describedby",
    "claim-notice-message",
  );

  notice
    .querySelectorAll(
      ".claim-notice__close, .claim-notice__action",
    )
    .forEach((button) => {
      button.addEventListener("click", () => {
        hideClaimNotice();
      });
    });

  notice.addEventListener("click", (event) => {
    if (event.target === notice) {
      hideClaimNotice();
    }
  });

  notice.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      hideClaimNotice();
      return;
    }

    if (event.key !== "Tab") return;

    const focusable = [
      ...notice.querySelectorAll(
        ".claim-notice__action, .claim-notice__close",
      ),
    ];

    const first = focusable[0];
    const last = focusable.at(-1);

    if (
      event.shiftKey &&
      document.activeElement === first
    ) {
      event.preventDefault();
      last?.focus();
    } else if (
      !event.shiftKey &&
      document.activeElement === last
    ) {
      event.preventDefault();
      first?.focus();
    }
  });

  document.body.append(notice);

  return notice;
}

function hideClaimNotice({ immediate = false } = {}) {
  const notice =
    document.querySelector(".claim-notice");

  if (!notice || notice.hidden) return;

  window.clearTimeout(noticeTimer);
  window.clearTimeout(noticeRemovalTimer);

  const finish = () => {
    notice.hidden = true;

    notice.classList.remove(
      "is-visible",
      "is-leaving",
    );

    if (noticeReturnFocus?.isConnected) {
      noticeReturnFocus.focus({
        preventScroll: true,
      });
    }

    noticeReturnFocus = null;
  };

  if (
    immediate ||
    window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches
  ) {
    finish();
    return;
  }

  notice.classList.remove("is-visible");
  notice.classList.add("is-leaving");

  noticeRemovalTimer =
    window.setTimeout(finish, 220);
}

function showClaimNotice({
  type = "info",
  title,
  message,
  autoClose,
} = {}) {
  const notice = getClaimNotice();

  if (!notice || !title || !message) return;

  const safeType =
    Object.hasOwn(NOTICE_ICONS, type)
      ? type
      : "info";

  if (
    notice.hidden &&
    !noticeReturnFocus &&
    document.activeElement instanceof HTMLElement
  ) {
    noticeReturnFocus = document.activeElement;
  }

  window.clearTimeout(noticeTimer);
  window.clearTimeout(noticeRemovalTimer);

  notice.hidden = false;

  notice.className =
    `claim-notice claim-notice--${safeType}`;

  notice.setAttribute(
    "role",
    safeType === "error"
      ? "alertdialog"
      : "dialog",
  );

  notice.setAttribute(
    "aria-live",
    safeType === "error"
      ? "assertive"
      : "polite",
  );

  notice.querySelector(
    ".claim-notice__icon",
  ).textContent = NOTICE_ICONS[safeType];

  notice.querySelector(
    ".claim-notice__title",
  ).textContent = title;

  notice.querySelector(
    ".claim-notice__message",
  ).textContent = message;

  window.requestAnimationFrame(() => {
    notice.classList.add("is-visible");

    notice
      .querySelector(".claim-notice__action")
      ?.focus({
        preventScroll: true,
      });
  });

  const duration = autoClose ?? 10000;

  if (duration > 0) {
    noticeTimer = window.setTimeout(
      () => hideClaimNotice(),
      duration,
    );
  }
}

// =====================================================
// ESTADO DEL BOTÓN
// =====================================================

function setSubmitting(submitting) {
  if (!submitButton) return;

  isSubmitting = submitting;

  submitButton.disabled = submitting;

  submitButton.classList.toggle(
    "is-loading",
    submitting,
  );

  submitButton.setAttribute(
    "aria-busy",
    String(submitting),
  );

  submitButton.textContent =
    submitting
      ? "Registrando..."
      : SUBMIT_BUTTON_TEXT;
}

// =====================================================
// TURNSTILE
// =====================================================

function resetTurnstile() {
  if (window.turnstile) {
    window.turnstile.reset();
  }
}

function isTurnstileError(result) {
  const details = [
    result?.error,
    result?.message,
    result?.debug,
  ]
    .filter(Boolean)
    .join(" ");

  return /turnstile|captcha|verificaci[oó]n|security token|challenge/i.test(
    details,
  );
}

// =====================================================
// RESPUESTA WORKER
// =====================================================

async function readWorkerResponse(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

// =====================================================
// ERRORES INLINE
// =====================================================

function getFieldErrorElement(field) {
  if (!field?.id) return null;

  const errorId = `${field.id}-error`;

  let error =
    document.getElementById(errorId);

  if (error) return error;

  const container =
    field.closest(".claim-field");

  if (!container) return null;

  error = document.createElement("p");

  error.id = errorId;
  error.className = "claim-field__error";
  error.hidden = true;

  container.append(error);

  return error;
}

function updateDescribedBy(
  field,
  errorId,
  includeError,
) {
  const ids = new Set(
    (
      field.getAttribute("aria-describedby") ||
      ""
    )
      .split(/\s+/)
      .filter(Boolean),
  );

  if (includeError) {
    ids.add(errorId);
  } else {
    ids.delete(errorId);
  }

  if (ids.size > 0) {
    field.setAttribute(
      "aria-describedby",
      [...ids].join(" "),
    );
  } else {
    field.removeAttribute(
      "aria-describedby",
    );
  }
}

function setFieldError(
  field,
  message = "",
) {
  const error =
    getFieldErrorElement(field);

  if (!error) return;

  const hasError = Boolean(message);

  field.classList.toggle(
    "is-invalid",
    hasError,
  );

  field.setAttribute(
    "aria-invalid",
    String(hasError),
  );

  error.textContent = message;
  error.hidden = !hasError;

  updateDescribedBy(
    field,
    error.id,
    hasError,
  );
}

// =====================================================
// VALIDADORES
// =====================================================

function validateName(value) {
  const normalized = value.trim();

  if (!normalized) {
    return "Ingresa tus nombres y apellidos.";
  }

  if (
    normalized.length < 2 ||
    normalized.length > 120
  ) {
    return "El nombre debe tener entre 2 y 120 caracteres.";
  }

  if (URL_PATTERN.test(normalized)) {
    return "Ingresa un nombre válido.";
  }

  if (!NAME_PATTERN.test(normalized)) {
    return "El nombre solo puede contener letras, espacios, apóstrofes y guiones.";
  }

  return "";
}

function validateDocument(value) {
  const normalized = value.trim();

  if (!normalized) {
    return "Ingresa tu DNI o CE.";
  }

  if (
    normalized.length < 3 ||
    normalized.length > 20
  ) {
    return "Ingresa un número de documento válido.";
  }

  if (!DOCUMENT_PATTERN.test(normalized)) {
    return "El documento contiene caracteres no válidos.";
  }

  if (URL_PATTERN.test(normalized)) {
    return "Ingresa un documento válido.";
  }

  return "";
}

function validateEmail(value) {
  const normalized = value.trim();

  if (!normalized) {
    return "Ingresa tu correo electrónico.";
  }

  if (normalized.length > 120) {
    return "El correo electrónico es demasiado largo.";
  }

  if (!EMAIL_PATTERN.test(normalized)) {
    return "Ingresa un correo electrónico válido.";
  }

  return "";
}

function validatePhone(value) {
  const normalized = value.trim();

  if (!normalized) {
    return "Ingresa tu número de teléfono.";
  }

  const digitCount =
    (
      normalized.match(/\d/g) || []
    ).length;

  if (
    normalized.length < 7 ||
    normalized.length > 20 ||
    digitCount < 7 ||
    digitCount > 15 ||
    !PHONE_PATTERN.test(normalized)
  ) {
    return "Ingresa un número de teléfono válido.";
  }

  return "";
}

function validateAddress(value) {
  const normalized = value.trim();

  /*
   * Para el Libro de Reclamaciones lo estamos
   * considerando obligatorio.
   */
  if (!normalized) {
    return "Ingresa tu domicilio.";
  }

  if (normalized.length < 5) {
    return "Ingresa un domicilio válido.";
  }

  if (normalized.length > 250) {
    return "El domicilio no puede superar los 250 caracteres.";
  }

  if (
    UNSAFE_SHORT_FIELD_PATTERN.test(
      normalized,
    )
  ) {
    return "El domicilio contiene caracteres no permitidos.";
  }

  return "";
}

function validateOrder(value) {
  const normalized = value.trim();

  // Campo opcional
  if (!normalized) return "";

  if (normalized.length > 100) {
    return "El número de pedido o comprobante no puede superar los 100 caracteres.";
  }

  if (
    UNSAFE_SHORT_FIELD_PATTERN.test(
      normalized,
    )
  ) {
    return "El número de pedido o comprobante contiene caracteres no permitidos.";
  }

  return "";
}

function validateDetail(value) {
  const normalized = value.trim();

  if (!normalized) {
    return "Describe el reclamo o queja.";
  }

  if (normalized.length < 5) {
    return "Describe con un poco más de detalle lo ocurrido.";
  }

  if (normalized.length > 3000) {
    return "El detalle no puede superar los 3000 caracteres.";
  }

  return "";
}

function validateRequest(value) {
  const normalized = value.trim();

  if (!normalized) {
    return "Indica qué solución solicitas.";
  }

  if (normalized.length < 2) {
    return "Indica de forma más clara tu pedido.";
  }

  if (normalized.length > 1500) {
    return "El pedido no puede superar los 1500 caracteres.";
  }

  return "";
}

// =====================================================
// MAPA DE VALIDADORES
// =====================================================

const FIELD_VALIDATORS = {
  "claim-name": validateName,
  "claim-document": validateDocument,
  "claim-email": validateEmail,
  "claim-phone": validatePhone,
  "claim-address": validateAddress,
  "claim-order": validateOrder,
  "claim-detail": validateDetail,
  "claim-request": validateRequest,
};

const CLAIM_FIELD_IDS =
  Object.keys(FIELD_VALIDATORS);

// =====================================================
// VALIDACIÓN INDIVIDUAL
// =====================================================

function validateClaimField(field) {
  const validator =
    FIELD_VALIDATORS[field.id];

  if (!validator) return true;

  const message =
    validator(field.value);

  setFieldError(
    field,
    message,
  );

  return !message;
}

// =====================================================
// CONTADORES
// =====================================================

function addCharacterCounter(
  field,
  maximum,
) {
  if (!field) return;

  field.maxLength = maximum;

  const container =
    field.closest(".claim-field");

  if (!container) return;

  let counter =
    container.querySelector(
      `[data-counter-for="${field.id}"]`,
    );

  if (!counter) {
    counter =
      document.createElement("small");

    counter.className =
      "claim-field__counter";

    counter.dataset.counterFor =
      field.id;

    container.append(counter);
  }

  const update = () => {
    counter.textContent =
      `${field.value.length}/${maximum}`;

    counter.classList.toggle(
      "is-near-limit",
      field.value.length >=
        maximum * 0.9,
    );
  };

  field.addEventListener(
    "input",
    update,
  );

  update();
}

// =====================================================
// RADIO: RECLAMO / QUEJA
// =====================================================

const claimTypeFieldset =
  form?.querySelector(
    ".claim-choice",
  );

const claimTypeRadios = [
  ...(
    form?.querySelectorAll(
      'input[name="claimType"]',
    ) || []
  ),
];

function getClaimTypeError() {
  if (!claimTypeFieldset) return null;

  let error =
    claimTypeFieldset.querySelector(
      "[data-claim-type-error]",
    );

  if (error) return error;

  error =
    document.createElement("p");

  error.className =
    "claim-field__error";

  error.dataset.claimTypeError = "";
  error.hidden = true;

  claimTypeFieldset.append(error);

  return error;
}

function validateClaimType() {
  const selected =
    claimTypeRadios.some(
      (radio) => radio.checked,
    );

  const error =
    getClaimTypeError();

  claimTypeFieldset?.classList.toggle(
    "is-invalid",
    !selected,
  );

  if (error) {
    error.textContent =
      selected
        ? ""
        : "Selecciona Reclamo o Queja.";

    error.hidden = selected;
  }

  return selected;
}

// =====================================================
// SELECT PERSONALIZADO
// PRODUCTO / SERVICIO
// =====================================================

const subjectInput =
  form?.querySelector(
    "#claim-subject",
  );

const subjectSelect =
  form?.querySelector(
    "[data-claim-select]",
  );

const subjectTrigger =
  form?.querySelector(
    "[data-claim-select-trigger]",
  );

const subjectValue =
  form?.querySelector(
    "[data-claim-select-value]",
  );

const subjectError =
  form?.querySelector(
    "[data-claim-select-error]",
  );

const subjectOptions = [
  ...(
    form?.querySelectorAll(
      "[data-claim-select-menu] [data-value]",
    ) || []
  ),
];

function validateSubject() {
  if (!subjectInput) return false;

  const valid =
    ["producto", "servicio"].includes(
      subjectInput.value,
    );

  subjectSelect?.classList.toggle(
    "is-invalid",
    !valid,
  );

  subjectTrigger?.setAttribute(
    "aria-invalid",
    String(!valid),
  );

  if (subjectError) {
    subjectError.textContent =
      valid
        ? ""
        : "Selecciona Producto o Servicio.";

    subjectError.hidden = valid;
  }

  return valid;
}

subjectOptions.forEach((option) => {
  option.addEventListener(
    "click",
    () => {
      const value =
        option.dataset.value || "";

      /*
       * Si information-pages.js ya gestiona
       * visualmente el select no molesta.
       */
      subjectInput.value = value;

      subjectInput.dispatchEvent(
        new Event("change", {
          bubbles: true,
        }),
      );

      validateSubject();
    },
  );
});

subjectInput?.addEventListener(
  "change",
  validateSubject,
);

// =====================================================
// VALIDACIÓN COMPLETA
// =====================================================

function validateClaimForm() {
  let firstInvalid = null;

  CLAIM_FIELD_IDS.forEach((id) => {
    const field =
      form.querySelector(`#${id}`);

    if (!field) return;

    validatedFields.add(field);

    if (
      !validateClaimField(field) &&
      !firstInvalid
    ) {
      firstInvalid = field;
    }
  });

  const typeValid =
    validateClaimType();

  if (
    !typeValid &&
    !firstInvalid
  ) {
    firstInvalid =
      claimTypeRadios[0];
  }

  const subjectValid =
    validateSubject();

  if (
    !subjectValid &&
    !firstInvalid
  ) {
    firstInvalid =
      subjectTrigger;
  }

  if (firstInvalid) {
    firstInvalid.focus?.({
      preventScroll: true,
    });

    firstInvalid.scrollIntoView?.({
      behavior: "smooth",
      block: "center",
    });

    return false;
  }

  return true;
}

// =====================================================
// RESET DE VALIDACIONES
// =====================================================

function resetFieldValidation() {
  CLAIM_FIELD_IDS.forEach((id) => {
    const field =
      form.querySelector(`#${id}`);

    if (field) {
      setFieldError(field);
    }
  });

  validatedFields.clear();

  claimTypeFieldset?.classList.remove(
    "is-invalid",
  );

  const typeError =
    getClaimTypeError();

  if (typeError) {
    typeError.hidden = true;
  }

  subjectSelect?.classList.remove(
    "is-invalid",
  );

  subjectTrigger?.removeAttribute(
    "aria-invalid",
  );

  if (subjectError) {
    subjectError.hidden = true;
  }
}

function resetSubjectSelect() {
  if (subjectInput) {
    subjectInput.value = "";
  }

  if (subjectValue) {
    subjectValue.textContent =
      "Selecciona una opción";
  }

  subjectOptions.forEach(
    (option) => {
      option.setAttribute(
        "aria-selected",
        "false",
      );
    },
  );
}

// =====================================================
// STATUS INFERIOR
// =====================================================

function setStatus(
  message,
  state = "",
) {
  if (!status) return;

  status.textContent = message;

  status.classList.remove(
    "is-error",
    "is-success",
    "is-warning",
  );

  if (state) {
    status.classList.add(
      `is-${state}`,
    );
  }
}

// =====================================================
// INICIALIZACIÓN
// =====================================================

if (form && submitButton) {
  /*
   * Usaremos nuestros propios mensajes
   * en lugar de los mensajes nativos.
   */
  form.noValidate = true;

  // Límites equivalentes al Worker
  form.querySelector(
    "#claim-name",
  ).maxLength = 120;

  form.querySelector(
    "#claim-document",
  ).maxLength = 20;

  form.querySelector(
    "#claim-email",
  ).maxLength = 120;

  form.querySelector(
    "#claim-phone",
  ).maxLength = 20;

  form.querySelector(
    "#claim-address",
  ).maxLength = 250;

  form.querySelector(
    "#claim-order",
  ).maxLength = 100;

  addCharacterCounter(
    form.querySelector("#claim-detail"),
    3000,
  );

  addCharacterCounter(
    form.querySelector("#claim-request"),
    1500,
  );

  // ===============================================
  // VALIDACIÓN EN TIEMPO REAL
  // ===============================================

  CLAIM_FIELD_IDS.forEach((id) => {
    const field =
      form.querySelector(`#${id}`);

    if (!field) return;

    field.addEventListener(
      "blur",
      () => {
        validatedFields.add(field);

        validateClaimField(field);
      },
    );

    field.addEventListener(
      "input",
      () => {
        /*
         * No mostramos rojo desde la primera
         * tecla. Primero debe haber interactuado
         * y salido del campo.
         */
        if (
          validatedFields.has(field)
        ) {
          validateClaimField(field);
        }
      },
    );
  });

  claimTypeRadios.forEach(
    (radio) => {
      radio.addEventListener(
        "change",
        validateClaimType,
      );
    },
  );

  // ===============================================
  // SUBMIT
  // ===============================================

  form.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      if (isSubmitting) return;

      if (!validateClaimForm()) {
        showClaimNotice({
          type: "warning",
          title:
            "Revisa la información ingresada",
          message:
            "Hay campos que necesitan ser corregidos antes de enviar la hoja de reclamación.",
        });

        return;
      }

      const formData =
        new FormData(form);

      const turnstileToken =
        formData.get(
          "cf-turnstile-response",
        );

      if (!turnstileToken) {
        showClaimNotice({
          type: "warning",
          title:
            "Completa la verificación",
          message:
            "Necesitamos validar la verificación de seguridad antes de registrar tu hoja.",
        });

        return;
      }

      const data = {
        name:
          formData
            .get("name")
            ?.trim() || "",

        document:
          formData
            .get("document")
            ?.trim() || "",

        email:
          formData
            .get("email")
            ?.trim() || "",

        phone:
          formData
            .get("phone")
            ?.trim() || "",

        address:
          formData
            .get("address")
            ?.trim() || "",

        claimType:
          formData.get(
            "claimType",
          ),

        subject:
          formData.get(
            "subject",
          ),

        order:
          formData
            .get("order")
            ?.trim() || "",

        detail:
          formData
            .get("detail")
            ?.trim() || "",

        request:
          formData
            .get("request")
            ?.trim() || "",

        turnstileToken,
      };

      hideClaimNotice({
        immediate: true,
      });

      setSubmitting(true);

      setStatus(
        "Registrando hoja de reclamación...",
      );

      try {
        const response =
          await fetch(
            WORKER_URL,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify(data),
            },
          );

        const result =
          await readWorkerResponse(
            response,
          );

        // Rate limiter por si lo agregas al Worker
        if (
          response.status === 429
        ) {
          showClaimNotice({
            type: "warning",
            title:
              "Espera un momento",
            message:
              "Ya se registró una solicitud reciente desde tu conexión. Espera un momento antes de volver a intentarlo.",
          });

          setStatus(
            "Debes esperar antes de realizar otro envío.",
            "warning",
          );

          resetTurnstile();

          return;
        }

        if (!response.ok) {
          console.error(
            "Worker respondió:",
            response.status,
            JSON.stringify(
              result,
              null,
              2,
            ),
          );

          if (
            isTurnstileError(
              result,
            )
          ) {
            showClaimNotice({
              type: "warning",
              title:
                "No pudimos verificar la solicitud",
              message:
                "Actualiza la verificación de seguridad e inténtalo nuevamente.",
            });
          } else {
            showClaimNotice({
              type: "error",
              title:
                "No pudimos registrar la hoja",
              message:
                result.message ||
                "Por favor, inténtalo nuevamente en unos momentos.",
            });
          }

          setStatus(
            result.message ||
              "No se pudo registrar la hoja de reclamación.",
            "error",
          );

          resetTurnstile();

          return;
        }

        /*
         * El Worker puede devolver success:true
         * aunque EmailJS falle porque D1 ya
         * registró oficialmente la hoja.
         */
        if (
          result.emailSent === false
        ) {
          setStatus(
            `Hoja ${result.numero} registrada correctamente. No se pudo enviar la copia por correo.`,
            "warning",
          );

          showClaimNotice({
            type: "warning",
            title:
              "Hoja registrada",
            message:
              `Tu hoja ${result.numero} fue registrada correctamente, pero tuvimos un inconveniente al enviar la copia por correo. No vuelvas a registrar el mismo reclamo.`,
            autoClose: 0,
          });
        } else {
          setStatus(
            `Hoja ${result.numero} registrada correctamente. Se envió una copia a tu correo electrónico.`,
            "success",
          );

          showClaimNotice({
            type: "success",
            title:
              "Hoja registrada correctamente",
            message:
              `Tu número de hoja es ${result.numero}. También enviamos una copia al correo electrónico que registraste.`,
            autoClose: 0,
          });
        }

        form.reset();

        resetFieldValidation();
        resetSubjectSelect();
        resetTurnstile();
      } catch (error) {
        console.error(
          "Error registrando reclamación:",
          error,
        );

        setStatus(
          "No se pudo conectar con el sistema. Inténtalo nuevamente.",
          "error",
        );

        showClaimNotice({
          type: "error",
          title:
            "No pudimos registrar la hoja",
          message:
            "No fue posible conectar con el sistema. Por favor, inténtalo nuevamente en unos momentos.",
        });

        resetTurnstile();
      } finally {
        setSubmitting(false);
      }
    },
  );
}