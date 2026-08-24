import "./contacto.css";

// =====================================================
// CONFIGURACIÓN
// =====================================================

const WORKER_URL =
  "https://spiegelau-contact-api.spiegelauweb.workers.dev";

const form = document.querySelector("#contact-form");
const submitButton = document.querySelector("#contact-submit");
const SUBMIT_BUTTON_TEXT = "Enviar mensaje";
const NOTICE_ICONS = {
  success: "check_circle",
  warning: "schedule",
  error: "error",
  info: "info",
};

let noticeTimer = null;
let noticeRemovalTimer = null;
let isSubmitting = false;
let noticeReturnFocus = null;

// =====================================================
// NOTIFICACIONES DEL FORMULARIO
// =====================================================

function getContactNotice() {
  let notice = document.querySelector(".contact-notice");

  if (notice) return notice;

  notice = document.createElement("div");
  notice.className = "contact-notice";
  notice.hidden = true;
  notice.setAttribute("aria-atomic", "true");
  notice.setAttribute("aria-modal", "true");
  notice.innerHTML = `
    <div class="contact-notice__panel">
      <span class="contact-notice__icon material-symbols-outlined" aria-hidden="true"></span>
      <div class="contact-notice__content">
        <strong class="contact-notice__title" id="contact-notice-title"></strong>
        <p class="contact-notice__message" id="contact-notice-message"></p>
        <button class="contact-notice__action" type="button">Entendido</button>
      </div>
      <button class="contact-notice__close" type="button" aria-label="Cerrar notificación">
        <span class="material-symbols-outlined" aria-hidden="true">close</span>
      </button>
    </div>
  `;
  notice.setAttribute("aria-labelledby", "contact-notice-title");
  notice.setAttribute("aria-describedby", "contact-notice-message");
  notice.querySelectorAll(".contact-notice__close, .contact-notice__action")
    .forEach((button) => button.addEventListener("click", () => hideContactNotice()));
  notice.addEventListener("click", (event) => {
    if (event.target === notice) hideContactNotice();
  });
  notice.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      hideContactNotice();
      return;
    }

    if (event.key !== "Tab") return;

    const focusableElements = [
      ...notice.querySelectorAll(".contact-notice__action, .contact-notice__close"),
    ];
    const firstElement = focusableElements[0];
    const lastElement = focusableElements.at(-1);

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  });
  document.body.append(notice);

  return notice;
}

function hideContactNotice({ immediate = false } = {}) {
  const notice = document.querySelector(".contact-notice");
  if (!notice || notice.hidden) return;

  window.clearTimeout(noticeTimer);
  window.clearTimeout(noticeRemovalTimer);

  const finish = () => {
    notice.hidden = true;
    notice.classList.remove("is-visible", "is-leaving");
    if (noticeReturnFocus?.isConnected) noticeReturnFocus.focus({ preventScroll: true });
    noticeReturnFocus = null;
  };

  if (immediate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    finish();
    return;
  }

  notice.classList.remove("is-visible");
  notice.classList.add("is-leaving");
  noticeRemovalTimer = window.setTimeout(finish, 220);
}

export function showContactNotice({
  type = "info",
  title,
  message,
  autoClose,
} = {}) {
  const notice = getContactNotice();
  if (!notice || !title || !message) return;

  const safeType = Object.hasOwn(NOTICE_ICONS, type) ? type : "info";
  if (notice.hidden && !noticeReturnFocus && document.activeElement instanceof HTMLElement) {
    noticeReturnFocus = document.activeElement;
  }
  window.clearTimeout(noticeTimer);
  window.clearTimeout(noticeRemovalTimer);

  notice.hidden = false;
  notice.className = `contact-notice contact-notice--${safeType}`;
  notice.setAttribute("role", "alertdialog");
  notice.setAttribute("aria-live", safeType === "error" ? "assertive" : "polite");
  notice.querySelector(".contact-notice__icon").textContent = NOTICE_ICONS[safeType];
  notice.querySelector(".contact-notice__title").textContent = title;
  notice.querySelector(".contact-notice__message").textContent = message;

  window.requestAnimationFrame(() => {
    notice.classList.add("is-visible");
    notice.querySelector(".contact-notice__action")?.focus({ preventScroll: true });
  });

  const duration = autoClose ?? 10000;
  if (duration > 0) {
    noticeTimer = window.setTimeout(() => hideContactNotice(), duration);
  }
}

function setSubmitting(submitting) {
  isSubmitting = submitting;
  submitButton.disabled = submitting;
  submitButton.classList.toggle("is-loading", submitting);
  submitButton.setAttribute("aria-busy", String(submitting));
  submitButton.textContent = submitting ? "Enviando..." : SUBMIT_BUTTON_TEXT;
}

function resetTurnstile() {
  if (window.turnstile) window.turnstile.reset();
}

function isTurnstileError(result) {
  const details = [result?.error, result?.message, result?.debug]
    .filter(Boolean)
    .join(" ");

  return /turnstile|captcha|verificaci[oó]n|security token|challenge/i.test(details);
}

async function readWorkerResponse(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

const validatedFields = new Set();
const CONTACT_FIELD_IDS = ["name", "email", "phone", "company", "message"];
const NAME_PATTERN = /^(?=.*\p{L})[\p{L}\p{M}\s.'’\-]+$/u;
const PHONE_PATTERN = /^[0-9+\s()\-]+$/;
const URL_PATTERN = /(?:https?:\/\/|www\.|(?:[a-z0-9-]+\.)+(?:com|net|org|pe|io|co|biz|info)(?:[/?#]|\b))/i;
const UNSAFE_COMPANY_PATTERN = /(?:<\s*\/?\s*script|javascript\s*:|data\s*:\s*text\/html|[<>])/i;

function getFieldErrorElement(field) {
  return document.getElementById(`${field.id}-error`);
}

function updateDescribedBy(field, errorId, includeError) {
  const ids = new Set(
    (field.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean),
  );
  if (includeError) ids.add(errorId);
  else ids.delete(errorId);

  if (ids.size > 0) field.setAttribute("aria-describedby", [...ids].join(" "));
  else field.removeAttribute("aria-describedby");
}

function setFieldError(field, message = "") {
  const errorElement = getFieldErrorElement(field);
  if (!errorElement) return;

  const hasError = Boolean(message);
  field.classList.toggle("is-invalid", hasError);
  field.setAttribute("aria-invalid", String(hasError));
  errorElement.textContent = message;
  errorElement.hidden = !hasError;
  updateDescribedBy(field, errorElement.id, hasError);
}

function validateName(value) {
  const normalized = value.trim();
  if (!normalized) return "Ingresa tu nombre completo.";
  if (normalized.length < 2 || normalized.length > 60 || URL_PATTERN.test(normalized) || !NAME_PATTERN.test(normalized)) {
    return "Ingresa un nombre válido.";
  }
  return "";
}

function validateEmail(value) {
  const normalized = value.trim();
  if (!normalized) return "Ingresa tu correo electrónico.";
  if (normalized.length > 100) return "Ingresa un correo electrónico válido.";

  const parts = normalized.split("@");
  if (parts.length !== 2) return "Ingresa un correo electrónico válido.";

  const [localPart, domain] = parts;
  const localIsValid = localPart.length > 0 && localPart.length <= 64 &&
    !localPart.startsWith(".") && !localPart.endsWith(".") &&
    !localPart.includes("..") && /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(localPart);
  const domainIsValid = domain.length <= 253 &&
    /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z]{2,63}$/i.test(domain);

  return localIsValid && domainIsValid ? "" : "Ingresa un correo electrónico válido.";
}

function validatePhone(value) {
  const normalized = value.trim();
  if (!normalized) return "Ingresa tu número de teléfono.";
  const digitCount = (normalized.match(/\d/g) || []).length;
  if (normalized.length < 7 || normalized.length > 20 || digitCount < 7 || digitCount > 15 || !PHONE_PATTERN.test(normalized)) {
    return "Ingresa un número de teléfono válido.";
  }
  return "";
}

function validateCompany(value) {
  const normalized = value.trim();
  if (!normalized) return "";
  if (normalized.length > 100) return "El nombre de la empresa no puede superar los 100 caracteres.";
  if (URL_PATTERN.test(normalized) || UNSAFE_COMPANY_PATTERN.test(normalized)) {
    return "Ingresa un nombre de empresa válido.";
  }
  return "";
}

function validateMessage(value) {
  const normalized = value.trim();
  if (!normalized) return "Escribe un mensaje.";
  if (normalized.length < 10) return "El mensaje debe tener al menos 10 caracteres.";
  if (normalized.length > 1000) return "El mensaje no puede superar los 1000 caracteres.";
  return "";
}

function validateContactField(field) {
  const validators = {
    name: validateName,
    email: validateEmail,
    phone: validatePhone,
    company: validateCompany,
    message: validateMessage,
  };
  const message = validators[field.id]?.(field.value) || "";
  setFieldError(field, message);
  return !message;
}

function validateContactForm() {
  const fields = CONTACT_FIELD_IDS.map((id) => form.querySelector(`#${id}`)).filter(Boolean);
  let firstInvalidField = null;

  fields.forEach((field) => {
    validatedFields.add(field);
    if (!validateContactField(field) && !firstInvalidField) firstInvalidField = field;
  });

  if (firstInvalidField) {
    firstInvalidField.focus({ preventScroll: true });
    firstInvalidField.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  return !firstInvalidField;
}

function resetFieldValidation() {
  CONTACT_FIELD_IDS.forEach((id) => {
    const field = form.querySelector(`#${id}`);
    if (field) setFieldError(field);
  });
  validatedFields.clear();
}

// =====================================================
// FORMULARIO
// =====================================================

if (form && submitButton) {
  form.noValidate = true;

  CONTACT_FIELD_IDS.forEach((id) => {
    const field = form.querySelector(`#${id}`);
    if (!field) return;

    field.addEventListener("blur", () => {
      validatedFields.add(field);
      validateContactField(field);
    });
    field.addEventListener("input", () => {
      if (validatedFields.has(field)) validateContactField(field);
    });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (isSubmitting) return;

    const nameField = form.querySelector("#name");
    const emailField = form.querySelector("#email");
    const phoneField = form.querySelector("#phone");
    const companyField = form.querySelector("#company");
    const messageField = form.querySelector("#message");
    const honeypotField = form.querySelector("#website");

    const name = nameField.value.trim();
    const email = emailField.value.trim();
    const phone = phoneField.value.trim();
    const company = companyField.value.trim();
    const message = messageField.value.trim();
    const honeypot = honeypotField.value.trim();

    // Un usuario real nunca completa el honeypot.
    if (honeypot !== "") return;

    if (!validateContactForm()) return;

    const turnstileToken = form.querySelector(
      '[name="cf-turnstile-response"]',
    )?.value;

    if (!turnstileToken) {
      showContactNotice({
        type: "warning",
        title: "No pudimos verificar la solicitud",
        message: "Actualiza la verificación de seguridad e inténtalo nuevamente.",
      });
      return;
    }

    hideContactNotice({ immediate: true });
    setSubmitting(true);

    try {
      const response = await fetch(WORKER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          phone,
          company,
          message,
          turnstileToken,
        }),
      });

      const result = await readWorkerResponse(response);

      if (response.status === 429) {
        showContactNotice({
          type: "warning",
          title: "Espera un momento",
          message:
            "Ya recibimos una solicitud reciente desde tu conexión. Podrás enviar otro mensaje en aproximadamente un minuto.",
        });
        // El próximo intento ocurrirá más tarde y necesita un token vigente.
        resetTurnstile();
        return;
      }

      if (!response.ok) {
        console.error(
  "Worker respondió:",
  response.status,
  JSON.stringify(result, null, 2)
);




        if (isTurnstileError(result)) {
          showContactNotice({
            type: "warning",
            title: "No pudimos verificar la solicitud",
            message: "Actualiza la verificación de seguridad e inténtalo nuevamente.",
          });
        } else {
          showContactNotice({
            type: "error",
            title: "No pudimos enviar tu mensaje",
            message: "Por favor, inténtalo nuevamente en unos momentos.",
          });
        }

        resetTurnstile();
        return;
      }

      form.reset();
      resetFieldValidation();
      resetTurnstile();
      showContactNotice({
        type: "success",
        title: "Mensaje enviado correctamente",
        message:
          "Hemos recibido tu consulta. Nuestro equipo se pondrá en contacto contigo a la brevedad.",
      });
    } catch (error) {
      console.error("Error enviando formulario:", error);
      showContactNotice({
        type: "error",
        title: "No pudimos enviar tu mensaje",
        message: "Por favor, inténtalo nuevamente en unos momentos.",
      });
      resetTurnstile();
    } finally {
      setSubmitting(false);
    }
  });
}
