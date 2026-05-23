"use strict";

let programmes     = [];
let subscribedIds  = new Set();
let searchQuery    = "";
let levelFilter    = "ALL";
let modalTriggerEl = null;
let _searchTimer   = null;

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function levelLabel(level) {
  return level === "UNDERGRADUATE" ? "Undergraduate" : "Postgraduate";
}

function levelBadgeClass(level) {
  return level === "UNDERGRADUATE" ? "badge--ug" : "badge--pg";
}

function isStudentUser() {
  const u = AuthState.getUser();
  return u && u.role !== "ADMIN";
}

function trackBtnHtml(programmeId) {
  if (!isStudentUser() || subscribedIds.has(programmeId)) return "";
  return `<button class="btn btn--track" id="track-btn-${programmeId}" data-programme-id="${programmeId}">Track</button>`;
}

async function trackProgramme(programmeId) {
  const btn = document.getElementById(`track-btn-${programmeId}`);
  if (!btn || btn.disabled) return;
  btn.disabled = true;
  btn.textContent = "Tracking…";

  try {
    const res = await AuthState.apiFetch("/api/subscriptions", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ programmeId }),
    });
    if (res.ok || res.status === 409) {
      subscribedIds.add(programmeId);
      btn.remove();
    } else {
      btn.disabled = false;
      btn.textContent = "Track";
    }
  } catch (e) {
    if (!(e instanceof AuthRedirectError)) {
      btn.disabled = false;
      btn.textContent = "Track";
    }
  }
}

function renderProgrammes() {
  const list = document.getElementById("programme-list");

  list.innerHTML = programmes.map((p) => {
    const duration = `${p.durationYears} year${p.durationYears > 1 ? "s" : ""}`;

    /* Module cards — grouped by year */
    function moduleCardHtml(m) {
      const thumb = m.imageUrl
        ? `<img class="prog-module-card__img" src="${escHtml(m.imageUrl)}" alt="" loading="lazy">`
        : `<span class="prog-module-card__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
              <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2zM22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
           </span>`;
      const desc = m.shortDescription
        ? `<p class="prog-module-card__desc">${escHtml(m.shortDescription)}</p>`
        : "";
      const leaderName = m.leaderFirstName
        ? `<span class="prog-module-card__leader">${escHtml([m.leaderFirstName, m.leaderLastName].filter(Boolean).join(" "))}</span>`
        : "";
      return `<li class="prog-module-card">${thumb}<div><span class="prog-module-card__title">${escHtml(m.title)}</span>${desc}${leaderName}</div></li>`;
    }

    let modulesHtml;
    if (!p.modules.length) {
      modulesHtml = `<li class="prog-module-card prog-module-card--empty">No modules assigned yet.</li>`;
    } else {
      const byYear = new Map();
      p.modules.forEach((m) => {
        const y = m.moduleYear ?? 1;
        if (!byYear.has(y)) byYear.set(y, []);
        byYear.get(y).push(m);
      });
      const years = [...byYear.keys()].sort((a, b) => a - b);
      const multiYear = years.length > 1;
      modulesHtml = years.map((y) => {
        const header = multiYear
          ? `</ul><p class="prog-modules-year-label">Year ${y}</p><ul class="prog-modules-grid" aria-label="Year ${y} modules">`
          : "";
        return header + byYear.get(y).map(moduleCardHtml).join("");
      }).join("");
      if (multiYear) modulesHtml = modulesHtml.replace(/^<\/ul>/, "");
    }

    /* Programme leader */
    const leaderHtml = p.leader ? (() => {
      const name    = [p.leader.firstName, p.leader.lastName].filter(Boolean).join(" ");
      const initStr = ((p.leader.firstName?.[0] ?? "") + (p.leader.lastName?.[0] ?? "")).toUpperCase();
      const avatar  = p.leader.imageUrl
        ? `<img class="prog-leader__avatar" src="${escHtml(p.leader.imageUrl)}" alt="">`
        : `<span class="prog-leader__avatar prog-leader__avatar--initials" aria-hidden="true">${escHtml(initStr)}</span>`;
      return `
        <div class="prog-leader">
          ${avatar}
          <div>
            <span class="prog-leader__label">Programme Leader</span>
            <span class="prog-leader__name">${escHtml(name)}</span>
            ${p.leader.position ? `<span class="prog-leader__role">${escHtml(p.leader.position)}</span>` : ""}
          </div>
        </div>`;
    })() : "";

    return `
      <li class="programme-card" id="card-${p.id}">
        <button
          class="programme-card__trigger"
          id="trigger-${p.id}"
          aria-expanded="false"
          aria-controls="body-${p.id}"
        >
          <div class="programme-card__info">
            <h3 class="programme-card__title">${escHtml(p.title)}</h3>
            <div class="programme-card__meta">
              <span class="badge ${levelBadgeClass(p.level)}">${levelLabel(p.level)}</span>
              <span class="programme-card__duration">${duration}</span>
            </div>
          </div>
          <svg class="programme-card__chevron" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          </svg>
        </button>

        <div class="programme-card__body" id="body-${p.id}" aria-hidden="true">
          <div class="programme-card__content">
            ${p.shortDescription ? `<p class="programme-card__short-desc">${escHtml(p.shortDescription)}</p>` : ""}
            <p class="programme-card__desc">${escHtml(p.description)}</p>
            ${leaderHtml}
            <p class="programme-card__modules-label">Core Modules</p>
            <ul class="prog-modules-grid" aria-label="Core modules for ${escHtml(p.title)}">${modulesHtml}</ul>
            <div class="programme-card__actions">
              <button
                class="btn btn--interest"
                id="contact-btn-${p.id}"
                data-programme-id="${p.id}"
                data-programme-title="${escHtml(p.title)}"
              >
                Contact Us
              </button>
              ${trackBtnHtml(p.id)}
            </div>
          </div>
        </div>
      </li>
    `;
  }).join("");

  /* Bind accordion, modal, and track triggers after render */
  programmes.forEach((p) => {
    document.getElementById(`trigger-${p.id}`)
      .addEventListener("click", () => toggleCard(p.id));

    document.getElementById(`contact-btn-${p.id}`)
      .addEventListener("click", (e) => {
        const btn = e.currentTarget;
        openModal(btn.dataset.programmeId, btn.dataset.programmeTitle, btn);
      });

    const trackBtn = document.getElementById(`track-btn-${p.id}`);
    if (trackBtn) trackBtn.addEventListener("click", () => trackProgramme(p.id));
  });
}

function toggleCard(id) {
  const card    = document.getElementById(`card-${id}`);
  const trigger = document.getElementById(`trigger-${id}`);
  const body    = document.getElementById(`body-${id}`);
  const isOpen  = card.classList.contains("is-open");

  /* Close all open cards first */
  document.querySelectorAll(".programme-card.is-open").forEach((c) => {
    const t = c.querySelector(".programme-card__trigger");
    const b = c.querySelector(".programme-card__body");
    c.classList.remove("is-open");
    t.setAttribute("aria-expanded", "false");
    b.setAttribute("aria-hidden", "true");
  });

  if (!isOpen) {
    card.classList.add("is-open");
    trigger.setAttribute("aria-expanded", "true");
    body.setAttribute("aria-hidden", "false");
    /* Scroll into view if needed */
    setTimeout(() => {
      card.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 50);
  }
}

function readUrlParams() {
  const p = new URLSearchParams(window.location.search);
  searchQuery = p.get("search") ?? "";
  levelFilter = p.get("level")  ?? "ALL";
}

function syncFormFields() {
  document.getElementById("search-input").value = searchQuery;
  document.getElementById("level-select").value = levelFilter;
}

function navigate() {
  const p = new URLSearchParams();
  if (searchQuery)           p.set("search", searchQuery);
  if (levelFilter !== "ALL") p.set("level",  levelFilter);
  const qs = p.toString();
  history.replaceState(null, "", qs ? `?${qs}` : location.pathname);
  loadProgrammes();
}

function updateCount() {
  const n = programmes.length;
  document.getElementById("programmes-count").textContent =
    n ? `Showing ${n} programme${n !== 1 ? "s" : ""}` : "";
  document.getElementById("programmes-empty").hidden = n > 0;
}

const backdrop = document.getElementById("modal-backdrop");
const modal    = document.getElementById("contact-modal");

function openModal(programmeId, programmeTitle, triggerEl) {
  modalTriggerEl = triggerEl;
  document.getElementById("modal-programme").textContent = programmeTitle;
  document.getElementById("contact-form").dataset.programmeId = programmeId;

  backdrop.classList.add("is-open");
  backdrop.removeAttribute("aria-hidden");
  document.body.style.overflow = "hidden";

  const url = new URL(window.location);
  url.searchParams.set("programme", programmeId);
  history.replaceState(null, "", url);

  /* Focus the modal — screen readers announce role/label */
  requestAnimationFrame(() => modal.focus());
}

function closeModal() {
  backdrop.classList.remove("is-open");
  backdrop.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";

  const url = new URL(window.location);
  url.searchParams.delete("programme");
  history.replaceState(null, "", url);

  const form = document.getElementById("contact-form");
  form.reset();
  form.querySelector(".contact-server-error")?.remove();
  clearFormErrors();

  modalTriggerEl?.focus();
  modalTriggerEl = null;
}

/* Focus trap — works for any modal container */
function trapFocus(e, container) {
  const focusable = Array.from(
    container.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  );
  const first = focusable[0];
  const last  = focusable[focusable.length - 1];

  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

function validateForm() {
  const form   = document.getElementById("contact-form");
  const fields = {
    firstName: { el: form.elements.firstName, error: "error-first-name", msg: "First name is required." },
    lastName:  { el: form.elements.lastName,  error: "error-last-name",  msg: "Last name is required."  },
    email:     { el: form.elements.email,     error: "error-email",      msg: "A valid email address is required." },
  };

  let valid = true;

  Object.entries(fields).forEach(([, { el, error, msg }]) => {
    const errorEl = document.getElementById(error);
    const isEmpty = !el.value.trim();
    const isEmailInvalid = el.type === "email" && el.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value);

    if (isEmpty || isEmailInvalid) {
      el.classList.add("is-error");
      el.setAttribute("aria-invalid", "true");
      errorEl.textContent = isEmpty ? msg : "Please enter a valid email address.";
      if (valid) el.focus(); /* Focus first invalid field */
      valid = false;
    } else {
      el.classList.remove("is-error");
      el.removeAttribute("aria-invalid");
      errorEl.textContent = "";
    }
  });

  return valid;
}

function clearFormErrors() {
  document.querySelectorAll(".form-error").forEach((el) => { el.textContent = ""; });
  document.querySelectorAll(".input.is-error").forEach((el) => {
    el.classList.remove("is-error");
    el.removeAttribute("aria-invalid");
  });
}

/* Search — debounced so we don't hit the server on every keystroke */
document.getElementById("search-input").addEventListener("input", (e) => {
  searchQuery = e.target.value;
  clearTimeout(_searchTimer);
  _searchTimer = setTimeout(navigate, 350);
});

/* Level filter — immediate */
document.getElementById("level-select").addEventListener("change", (e) => {
  levelFilter = e.target.value;
  navigate();
});

/* Smooth scroll CTA */
document.getElementById("browse-btn").addEventListener("click", (e) => {
  e.preventDefault();
  document.getElementById("programmes").scrollIntoView({ behavior: "smooth" });
});

/* Modal close button */
document.getElementById("modal-close").addEventListener("click", closeModal);

/* Backdrop click */
backdrop.addEventListener("click", (e) => {
  if (e.target === backdrop) closeModal();
});

/* Keyboard — contact modal */
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (backdrop.classList.contains("is-open"))     closeModal();
    if (authBackdrop.classList.contains("is-open")) closeAuthModal();
  }
  if (e.key === "Tab") {
    if (backdrop.classList.contains("is-open"))     trapFocus(e, modal);
    if (authBackdrop.classList.contains("is-open")) trapFocus(e, authModal);
  }
});

/* Form submit */
document.getElementById("contact-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!validateForm()) return;

  const submitBtn = e.target.querySelector("[type=submit]");
  const origText  = submitBtn.textContent;
  submitBtn.disabled    = true;
  submitBtn.textContent = "Submitting…";

  const data        = Object.fromEntries(new FormData(e.target));
  const programmeId = Number(e.target.dataset.programmeId);

  try {
    const res  = await fetch("/api/contact", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ ...data, programmeId }),
    });
    const json = await res.json();

    if (!res.ok) {
      const banner = e.target.querySelector(".contact-server-error") ?? (() => {
        const el = document.createElement("p");
        el.className = "contact-server-error form-error";
        el.style.textAlign    = "center";
        el.style.marginBottom = "0.5rem";
        e.target.prepend(el);
        return el;
      })();
      banner.textContent = json.error ?? "Something went wrong. Please try again.";
      return;
    }

    closeModal();
    /* Brief success confirmation */
    const toast = document.createElement("div");
    toast.className = "contact-toast";
    toast.textContent = "Thank you! We'll be in touch soon.";
    document.body.appendChild(toast);
    requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add("is-visible")));
    setTimeout(() => { toast.classList.remove("is-visible"); setTimeout(() => toast.remove(), 400); }, 4000);
  } catch {
    alert("Network error. Please try again.");
  } finally {
    submitBtn.disabled    = false;
    submitBtn.textContent = origText;
  }
});

/* Header scroll state */
window.addEventListener("scroll", () => {
  document.getElementById("header")
    .classList.toggle("is-scrolled", window.scrollY > 8);
}, { passive: true });

const authBackdrop = document.getElementById("auth-backdrop");
const authModal    = document.getElementById("auth-modal");
let   authTrigger  = null;

function openAuthModal() {
  authTrigger = document.activeElement;
  authBackdrop.classList.add("is-open");
  authBackdrop.removeAttribute("aria-hidden");
  document.body.style.overflow = "hidden";
  requestAnimationFrame(() => authModal.focus());
}

function closeAuthModal() {
  authBackdrop.classList.remove("is-open");
  authBackdrop.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  document.getElementById("login-form").reset();
  document.getElementById("register-form").reset();
  clearAuthErrors();
  authTrigger?.focus();
  authTrigger = null;
}

/* Switch between login ↔ register views */
function switchAuthView(showId, hideId) {
  const show = document.getElementById(showId);
  const hide = document.getElementById(hideId);

  hide.classList.add("auth-view--exit");

  setTimeout(() => {
    hide.classList.add("auth-view--hidden");
    hide.classList.remove("auth-view--exit");
    hide.setAttribute("aria-hidden", "true");

    show.classList.remove("auth-view--hidden");
    show.setAttribute("aria-hidden", "false");
    show.classList.add("auth-view--enter");

    /* Trigger reflow to animate from enter state */
    show.getBoundingClientRect();
    show.classList.remove("auth-view--enter");

    /* Focus first input in the new view */
    show.querySelector("input")?.focus();

    /* Update dialog label to reflect active view title */
    const newTitle = show.querySelector(".modal__title");
    if (newTitle) authModal.setAttribute("aria-labelledby", newTitle.id || "auth-title");
  }, 180);
}

function clearAuthErrors() {
  authModal.querySelectorAll(".form-error").forEach((el) => { el.textContent = ""; });
  authModal.querySelectorAll(".input.is-error").forEach((el) => {
    el.classList.remove("is-error");
    el.removeAttribute("aria-invalid");
  });
}

/* Auth events */
document.getElementById("auth-btn").addEventListener("click", openAuthModal);
document.getElementById("auth-modal-close").addEventListener("click", closeAuthModal);

authBackdrop.addEventListener("click", (e) => {
  if (e.target === authBackdrop) closeAuthModal();
});

document.getElementById("go-to-register").addEventListener("click", () => {
  switchAuthView("auth-view-register", "auth-view-login");
});

document.getElementById("go-to-login").addEventListener("click", () => {
  switchAuthView("auth-view-login", "auth-view-register");
});

/* ── Auth form submissions ── */
async function submitAuthForm(endpoint, data, submitBtn) {
  const original = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = "Please wait…";

  try {
    const res = await fetch(endpoint, {
      method:      "POST",
      credentials: "include",
      headers:     { "Content-Type": "application/json" },
      body:        JSON.stringify(data),
    });
    const json = await res.json();

    if (!res.ok) {
      /* Show server error inside the modal */
      const errorBanner = authModal.querySelector(".auth-server-error") ?? (() => {
        const el = document.createElement("p");
        el.className = "auth-server-error form-error";
        el.style.textAlign = "center";
        el.style.marginBottom = "0.75rem";
        authModal.querySelector("form:not([hidden])").prepend(el);
        return el;
      })();
      errorBanner.textContent = json.error ?? "Something went wrong.";
      return;
    }

    /* Success — persist user, update header, close modal */
    localStorage.setItem("dmp_user", JSON.stringify(json.user));
    closeAuthModal();
    window.location.reload(); /* reload so header re-renders with avatar */

  } catch {
    alert("Network error. Please try again.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = original;
  }
}

document.getElementById("login-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  submitAuthForm("/api/auth/login", data, e.target.querySelector("[type=submit]"));
});

document.getElementById("register-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  submitAuthForm("/api/auth/register", data, e.target.querySelector("[type=submit]"));
});

async function loadSubscriptions() {
  if (!isStudentUser()) return;
  try {
    const res = await fetch("/api/subscriptions", { credentials: "include" });
    if (!res.ok) return;
    const data = await res.json();
    subscribedIds = new Set((data.subscriptions ?? []).map((s) => s.programmeId));
  } catch { /* silent — no subscriptions loaded */ }
}

async function loadProgrammes() {
  const list  = document.getElementById("programme-list");
  const count = document.getElementById("programmes-count");
  const empty = document.getElementById("programmes-empty");

  list.innerHTML = `<li class="programmes-loading" aria-live="polite">Loading…</li>`;
  count.textContent = "";
  empty.hidden = true;

  const p = new URLSearchParams();
  if (searchQuery)           p.set("search", searchQuery);
  if (levelFilter !== "ALL") p.set("level",  levelFilter);
  const qs = p.toString();

  try {
    const [progsRes] = await Promise.all([
      fetch(`/api/programmes${qs ? `?${qs}` : ""}`),
      loadSubscriptions(),
    ]);
    const data = await progsRes.json();
    programmes = data.programmes ?? [];
  } catch {
    list.innerHTML = `<li class="programmes-loading">Failed to load programmes. Please refresh the page.</li>`;
    return;
  }

  renderProgrammes();
  updateCount();
}

readUrlParams();
syncFormFields();
loadProgrammes();
