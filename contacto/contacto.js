import "./contacto.css";

// =====================================================
// CONFIGURACIÓN
// =====================================================

const WORKER_URL =
  "https://spiegelau-contact-api.pruebaform837.workers.dev";

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

function showValidationNotice(title, message, field) {
  noticeReturnFocus = field;
  showContactNotice({ type: "info", title, message });
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

// =====================================================
// FORMULARIO
// =====================================================

if (form && submitButton) {
  form.noValidate = true;

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

    if (name.length < 2 || name.length > 60) {
      showValidationNotice(
        "Revisa tu nombre",
        "Ingresa un nombre válido de entre 2 y 60 caracteres.",
        nameField,
      );
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showValidationNotice(
        "Revisa tu correo electrónico",
        "Ingresa una dirección de correo válida para que podamos responderte.",
        emailField,
      );
      return;
    }

    const phoneRegex = /^[0-9+\s()-]{7,20}$/;
    if (!phoneRegex.test(phone)) {
      showValidationNotice(
        "Revisa tu teléfono",
        "Ingresa un número válido de entre 7 y 20 caracteres.",
        phoneField,
      );
      return;
    }

    if (message.length < 10 || message.length > 1000) {
      showValidationNotice(
        "Revisa tu mensaje",
        "El mensaje debe contener entre 10 y 1000 caracteres.",
        messageField,
      );
      return;
    }

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
        console.error("Worker respondió:", result);

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
