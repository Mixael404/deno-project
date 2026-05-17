"use strict";

/* ══════════════════════════════════════════════════════
   MOCK DATA  (replace with fetch('/api/programmes') later)
   ══════════════════════════════════════════════════════ */
const PROGRAMMES = [
  {
    id: 1,
    title: "BSc Computer Science",
    level: "UNDERGRADUATE",
    durationYears: 3,
    shortDescription:
      "Build the technical foundations of modern software — from algorithms and data structures to operating systems and distributed computing.",
    description:
      "Our BSc Computer Science equips you with rigorous theory and practical skills across software development, systems design, databases, and computer networking. You will engage in live industry projects through our partner placement scheme, graduating ready to excel in any technology role.",
    modules: ["Programming Fundamentals", "Data Structures & Algorithms", "Database Systems", "Computer Networks", "Software Engineering"],
  },
  {
    id: 2,
    title: "MSc Cyber Security",
    level: "POSTGRADUATE",
    durationYears: 1,
    shortDescription:
      "Become a specialist in protecting digital infrastructure against evolving global threats — from network intrusion to advanced persistent attacks.",
    description:
      "In an increasingly connected world, cyber security professionals are among the most sought-after talent globally. This intensive MSc provides hands-on experience with penetration testing, threat analysis, cryptography, digital forensics, and incident response. You will complete a substantial research dissertation on a live security challenge.",
    modules: ["Network Security", "Cryptography & PKI", "Ethical Hacking", "Digital Forensics", "Security Risk Management"],
  },
  {
    id: 3,
    title: "BSc Software Engineering",
    level: "UNDERGRADUATE",
    durationYears: 4,
    shortDescription:
      "Master the discipline of building reliable, scalable software systems. Includes an optional industry placement year with a leading technology company.",
    description:
      "Software Engineering at De Montfort goes far beyond coding — it is about architecting systems that stand the test of time. Over four years, including an optional placement in year three, you will learn design patterns, agile methodologies, quality assurance, DevOps practices, and team-based development that mirrors real-world environments.",
    modules: ["Software Architecture", "Agile Development", "Software Testing & QA", "DevOps & CI/CD", "Cloud Computing"],
  },
  {
    id: 4,
    title: "MSc Artificial Intelligence",
    level: "POSTGRADUATE",
    durationYears: 1,
    shortDescription:
      "Develop cutting-edge AI systems at the intersection of machine learning, data science, and cognitive computing.",
    description:
      "This intensive MSc in Artificial Intelligence covers the full spectrum of modern AI — from classical machine learning to deep neural networks, natural language processing, computer vision, and reinforcement learning. You will build production-ready AI systems and conduct original research in your dissertation project.",
    modules: ["Machine Learning", "Deep Learning", "Natural Language Processing", "Computer Vision", "AI Ethics & Governance"],
  },
  {
    id: 5,
    title: "BSc Business Management",
    level: "UNDERGRADUATE",
    durationYears: 3,
    shortDescription:
      "Develop leadership, strategic thinking, and entrepreneurial skills to thrive in dynamic global markets.",
    description:
      "Our BSc Business Management blends core business theory with applied practice. You will study finance, marketing, human resources, and operations while developing analytical and leadership skills that employers value. Guest lectures from industry leaders and live project briefs make this a highly practical degree.",
    modules: ["Business Strategy", "Financial Management", "Marketing Principles", "Organisational Behaviour", "Entrepreneurship"],
  },
];

/* ══════════════════════════════════════════════════════
   STATE
   ══════════════════════════════════════════════════════ */
let searchQuery = "";
let levelFilter = "ALL";
let modalTriggerEl = null;

/* ══════════════════════════════════════════════════════
   HTML HELPERS
   ══════════════════════════════════════════════════════ */
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

/* ══════════════════════════════════════════════════════
   RENDER
   ══════════════════════════════════════════════════════ */
function renderProgrammes() {
  const list = document.getElementById("programme-list");

  list.innerHTML = PROGRAMMES.map((p) => {
    const duration = `${p.durationYears} year${p.durationYears > 1 ? "s" : ""}`;
    const modules  = p.modules
      .map((m) => `<li><span class="module-tag">${escHtml(m)}</span></li>`)
      .join("");

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
          <svg
            class="programme-card__chevron"
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          </svg>
        </button>

        <div
          class="programme-card__body"
          id="body-${p.id}"
          aria-hidden="true"
        >
          <div class="programme-card__content">
            <p class="programme-card__short-desc">${escHtml(p.shortDescription)}</p>
            <p class="programme-card__desc">${escHtml(p.description)}</p>
            <p class="programme-card__modules-label">Core Modules</p>
            <ul class="programme-card__modules" aria-label="Core modules for ${escHtml(p.title)}">
              ${modules}
            </ul>
            <div class="programme-card__actions">
              <button
                class="btn btn--interest"
                id="contact-btn-${p.id}"
                data-programme-id="${p.id}"
                data-programme-title="${escHtml(p.title)}"
              >
                Contact Us
              </button>
            </div>
          </div>
        </div>
      </li>
    `;
  }).join("");

  /* Bind accordion + modal triggers after render */
  PROGRAMMES.forEach((p) => {
    document.getElementById(`trigger-${p.id}`)
      .addEventListener("click", () => toggleCard(p.id));

    document.getElementById(`contact-btn-${p.id}`)
      .addEventListener("click", (e) => {
        const btn = e.currentTarget;
        openModal(btn.dataset.programmeId, btn.dataset.programmeTitle, btn);
      });
  });
}

/* ══════════════════════════════════════════════════════
   ACCORDION
   ══════════════════════════════════════════════════════ */
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

/* ══════════════════════════════════════════════════════
   FILTER
   ══════════════════════════════════════════════════════ */
function applyFilter() {
  const q     = searchQuery.toLowerCase().trim();
  const level = levelFilter;
  let   count = 0;

  PROGRAMMES.forEach((p) => {
    const card = document.getElementById(`card-${p.id}`);
    const matchLevel  = level === "ALL" || p.level === level;
    const matchSearch = !q
      || p.title.toLowerCase().includes(q)
      || p.shortDescription.toLowerCase().includes(q)
      || p.description.toLowerCase().includes(q)
      || p.modules.some((m) => m.toLowerCase().includes(q));

    if (matchLevel && matchSearch) {
      card.classList.remove("is-hidden");
      count++;
    } else {
      card.classList.add("is-hidden");
    }
  });

  document.getElementById("programmes-count").textContent =
    `Showing ${count} of ${PROGRAMMES.length} programme${PROGRAMMES.length !== 1 ? "s" : ""}`;
  document.getElementById("programmes-empty").hidden = count > 0;
}

/* ══════════════════════════════════════════════════════
   MODAL
   ══════════════════════════════════════════════════════ */
const backdrop = document.getElementById("modal-backdrop");
const modal    = document.getElementById("contact-modal");

function openModal(programmeId, programmeTitle, triggerEl) {
  modalTriggerEl = triggerEl;
  document.getElementById("modal-programme").textContent = programmeTitle;

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

  document.getElementById("contact-form").reset();
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

/* ══════════════════════════════════════════════════════
   FORM VALIDATION
   ══════════════════════════════════════════════════════ */
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

/* ══════════════════════════════════════════════════════
   EVENT LISTENERS
   ══════════════════════════════════════════════════════ */
/* Search */
document.getElementById("search-input").addEventListener("input", (e) => {
  searchQuery = e.target.value;
  applyFilter();
});

/* Level filter */
document.getElementById("level-select").addEventListener("change", (e) => {
  levelFilter = e.target.value;
  applyFilter();
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
document.getElementById("contact-form").addEventListener("submit", (e) => {
  e.preventDefault();
  if (!validateForm()) return;

  const data = Object.fromEntries(new FormData(e.target));
  /* TODO: POST to /api/contact-requests */
  console.log("Interest registered:", data);
  closeModal();
});

/* Header scroll state */
window.addEventListener("scroll", () => {
  document.getElementById("header")
    .classList.toggle("is-scrolled", window.scrollY > 8);
}, { passive: true });

/* ══════════════════════════════════════════════════════
   AUTH MODAL
   ══════════════════════════════════════════════════════ */
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

/* ══════════════════════════════════════════════════════
   INIT
   ══════════════════════════════════════════════════════ */
renderProgrammes();
applyFilter();
