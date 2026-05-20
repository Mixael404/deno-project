"use strict";

const me = AuthState.getUser();
if (!me || me.role !== "ADMIN") {
  window.location.replace("/");
}

function escHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    year: "numeric", month: "short", day: "numeric",
  });
}

function initials(u) {
  const f = u.firstName?.[0] ?? "";
  const l = u.lastName?.[0]  ?? "";
  return (f + l).toUpperCase() || (u.email?.[0] ?? "?").toUpperCase();
}

function fullName(u) {
  return [u.firstName, u.lastName].filter(Boolean).join(" ") || "—";
}

function showToast(message, type = "success") {
  const t = document.createElement("div");
  t.className = `admin-toast admin-toast--${type}`;
  t.setAttribute("role", "status");
  t.setAttribute("aria-live", "polite");
  t.textContent = message;
  document.body.appendChild(t);
  requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add("is-visible")));
  setTimeout(() => {
    t.classList.remove("is-visible");
    setTimeout(() => t.remove(), 350);
  }, 3500);
}

class Modal {
  constructor(backdropId) {
    this.bd    = document.getElementById(backdropId);
    this._prev = null;
    this._onKey = this._handleKey.bind(this);
    this._onBd  = (e) => { if (e.target === this.bd) this.close(); };
  }

  open() {
    this.bd.removeAttribute("inert");
    this.bd.classList.add("is-open");
    this._prev = document.activeElement;
    const first = this.bd.querySelector(
      'input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled])'
    );
    setTimeout(() => (first ?? this.bd.querySelector(".modal__close"))?.focus(), 60);
    document.addEventListener("keydown", this._onKey);
    this.bd.addEventListener("click", this._onBd);
  }

  close() {
    this.bd.classList.remove("is-open");
    document.removeEventListener("keydown", this._onKey);
    this.bd.removeEventListener("click", this._onBd);
    this._prev?.focus();
    setTimeout(() => this.bd.setAttribute("inert", ""), 240);
  }

  _handleKey(e) {
    if (e.key === "Escape") { e.preventDefault(); this.close(); return; }
    if (e.key !== "Tab") return;
    const sel = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(",");
    const els = [...this.bd.querySelectorAll(sel)];
    if (els.length < 2) return;
    const first = els[0], last = els[els.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  }
}

const TABS = ["users", "staff", "modules", "programmes"];

function switchTab(name) {
  TABS.forEach((t) => {
    const btn   = document.getElementById(`tab-btn-${t}`);
    const panel = document.getElementById(`tab-${t}`);
    const active = t === name;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-selected", String(active));
    panel.hidden = !active;
  });
}

document.querySelectorAll(".admin-tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => switchTab(btn.id.replace("tab-btn-", "")));

  btn.addEventListener("keydown", (e) => {
    const idx = TABS.indexOf(btn.id.replace("tab-btn-", ""));
    if (e.key === "ArrowRight") {
      e.preventDefault();
      const next = TABS[(idx + 1) % TABS.length];
      document.getElementById(`tab-btn-${next}`).focus();
      switchTab(next);
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      const prev = TABS[(idx - 1 + TABS.length) % TABS.length];
      document.getElementById(`tab-btn-${prev}`).focus();
      switchTab(prev);
    }
  });
});

let allUsers      = [];
let allStaff      = [];
let allModules    = [];
let allProgrammes = [];

let staffEditId      = null;
let moduleEditId     = null;
let programmeEditId  = null;

function updateStats() {
  const students = allUsers.filter((u) => u.role === "STUDENT").length;
  const admins   = allUsers.filter((u) => u.role === "ADMIN").length;
  document.getElementById("stat-total").textContent      = allUsers.length;
  document.getElementById("stat-students").textContent   = students;
  document.getElementById("stat-admins").textContent     = admins;
  document.getElementById("stat-staff").textContent      = allStaff.length;
  document.getElementById("stat-modules").textContent    = allModules.length;
  document.getElementById("stat-programmes").textContent = allProgrammes.length;
}

function renderUsers(users) {
  const tbody = document.getElementById("users-table-body");
  const empty = document.getElementById("users-empty");

  if (!users.length) {
    tbody.innerHTML = "";
    empty.hidden = false;
    return;
  }
  empty.hidden = true;
  tbody.innerHTML = users.map((u) => {
    const roleCls = u.role === "ADMIN" ? "badge--admin" : "badge--student";
    return `
      <tr>
        <td>
          <div class="user-cell">
            <span class="avatar avatar--sm" aria-hidden="true">${escHtml(initials(u))}</span>
            <span class="user-cell__name">${escHtml(fullName(u))}</span>
          </div>
        </td>
        <td class="data-table__secondary">${escHtml(u.email)}</td>
        <td><span class="badge ${roleCls}">${escHtml(u.role)}</span></td>
        <td class="data-table__secondary col-hide-mobile">${formatDate(u.createdAt)}</td>
      </tr>`;
  }).join("");
}

function applyUserSearch(query) {
  const q = query.toLowerCase().trim();
  if (!q) { renderUsers(allUsers); return; }
  renderUsers(allUsers.filter((u) =>
    fullName(u).toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  ));
}

async function loadUsers() {
  try {
    const res = await AuthState.apiFetch("/api/admin/users");
    ({ users: allUsers } = await res.json());
    renderUsers(allUsers);
    updateStats();
  } catch (e) {
    if (e instanceof AuthRedirectError) return;
    document.getElementById("users-table-body").innerHTML =
      `<tr><td colspan="4" class="data-table__error">Failed to load users. Please refresh.</td></tr>`;
  }
}

document.getElementById("user-search").addEventListener("input", (e) => applyUserSearch(e.target.value));

function createImageUploader(prefix) {
  const area       = document.getElementById(`${prefix}-upload-area`);
  const fileInput  = document.getElementById(`${prefix}-image-file`);
  const urlField   = document.getElementById(`${prefix}-image-url`);
  const ph         = document.getElementById(`${prefix}-upload-ph`);
  const preview    = document.getElementById(`${prefix}-upload-preview`);
  const previewImg = document.getElementById(`${prefix}-preview-img`);
  const removeBtn  = document.getElementById(`${prefix}-remove-img`);
  const spinner    = document.getElementById(`${prefix}-upload-spin`);
  const errEl      = document.getElementById(`${prefix}-img-err`);

  function showState(state) {
    ph.hidden      = state !== "idle";
    preview.hidden = state !== "preview";
    spinner.hidden = state !== "busy";
    area.classList.toggle("is-busy", state === "busy");
  }

  async function uploadFile(file) {
    if (!file) return;
    errEl.textContent = "";
    showState("busy");

    const fd = new FormData();
    fd.append("file", file);
    try {
      const res  = await AuthState.apiFetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        errEl.textContent = data.error ?? "Upload failed.";
        showState("idle");
        return;
      }
      urlField.value   = data.url;
      previewImg.src   = data.url;
      showState("preview");
    } catch (e) {
      if (!(e instanceof AuthRedirectError)) {
        errEl.textContent = "Upload failed — please try again.";
      }
      showState("idle");
    } finally {
      fileInput.value = "";
    }
  }

  function reset() {
    urlField.value    = "";
    previewImg.src    = "";
    fileInput.value   = "";
    errEl.textContent = "";
    showState("idle");
  }

  function setExisting(url) {
    if (!url) { reset(); return; }
    urlField.value    = url;
    previewImg.src    = url;
    errEl.textContent = "";
    showState("preview");
  }

  area.addEventListener("click", (e) => {
    if (!removeBtn.contains(e.target)) fileInput.click();
  });

  area.addEventListener("keydown", (e) => {
    if (e.target === area && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      fileInput.click();
    }
  });

  fileInput.addEventListener("change", () => uploadFile(fileInput.files[0]));

  area.addEventListener("dragover", (e) => {
    e.preventDefault();
    area.classList.add("is-dragover");
  });
  area.addEventListener("dragleave", (e) => {
    if (!area.contains(e.relatedTarget)) area.classList.remove("is-dragover");
  });
  area.addEventListener("drop", (e) => {
    e.preventDefault();
    area.classList.remove("is-dragover");
    uploadFile(e.dataTransfer.files[0]);
  });

  removeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    reset();
  });

  return { reset, setExisting };
}

const staffUploader  = createImageUploader("staff");
const moduleUploader = createImageUploader("mod");
const progUploader   = createImageUploader("prog");

const confirmModal = new Modal("confirm-modal-bd");
let _confirmCallback = null;

document.getElementById("confirm-cancel-btn").addEventListener("click", () => confirmModal.close());
document.getElementById("confirm-modal-close").addEventListener("click", () => confirmModal.close());
document.getElementById("confirm-ok-btn").addEventListener("click", () => {
  confirmModal.close();
  _confirmCallback?.();
});

function showConfirm({ title, body, onConfirm }) {
  document.getElementById("confirm-modal-title").textContent = title;
  document.getElementById("confirm-modal-body").textContent  = body;
  _confirmCallback = onConfirm;
  confirmModal.open();
}

const staffModal = new Modal("staff-modal-bd");

function renderStaff(staff) {
  const tbody = document.getElementById("staff-table-body");
  const empty = document.getElementById("staff-empty");

  if (!staff.length) {
    tbody.innerHTML = "";
    empty.hidden = false;
    return;
  }
  empty.hidden = true;
  tbody.innerHTML = staff.map((s) => `
    <tr>
      <td>
        <div class="user-cell">
          <span class="avatar avatar--sm" aria-hidden="true">${escHtml(initials(s))}</span>
          <span class="user-cell__name">${escHtml(fullName(s))}</span>
        </div>
      </td>
      <td class="data-table__secondary col-hide-mobile">${escHtml(s.email)}</td>
      <td class="data-table__secondary">${escHtml(s.position)}</td>
      <td class="data-table__secondary col-hide-mobile">${formatDate(s.createdAt)}</td>
      <td class="col-actions">
        <div class="row-actions">
          <button class="btn-action btn-action--edit" data-id="${s.id}"
            aria-label="Edit ${escHtml(fullName(s))}">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <button class="btn-action btn-action--delete" data-id="${s.id}"
            aria-label="Delete ${escHtml(fullName(s))}">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <polyline points="3 6 5 6 21 6"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M10 11v6M14 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </td>
    </tr>`
  ).join("");
}

function populateStaffDropdowns() {
  const opts = allStaff.map((s) =>
    `<option value="${escHtml(String(s.id))}">${escHtml(fullName(s))} — ${escHtml(s.position)}</option>`
  ).join("");

  ["mod-leader", "prog-leader"].forEach((id) => {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = `<option value="">— Select staff member —</option>${opts}`;
  });
}

function populateModulesPicker(selectedIds = []) {
  const picker = document.getElementById("prog-modules-picker");
  if (!allModules.length) {
    picker.innerHTML = `<p class="modules-picker__empty">No modules available yet.</p>`;
    return;
  }
  picker.innerHTML = allModules.map((m) => {
    const checked = selectedIds.includes(m.id) ? " checked" : "";
    const code    = m.code ? `<span class="modules-picker__code">${escHtml(m.code)}</span>` : "";
    return `
      <label class="modules-picker__item">
        <input type="checkbox" class="modules-picker__checkbox" name="moduleIds" value="${m.id}"${checked}>
        <span class="modules-picker__title">${escHtml(m.title)}</span>
        ${code}
      </label>`;
  }).join("");
}

async function loadStaff() {
  try {
    const res = await AuthState.apiFetch("/api/admin/staff");
    ({ staff: allStaff } = await res.json());
    renderStaff(allStaff);
    updateStats();
    populateStaffDropdowns();
  } catch (e) {
    if (e instanceof AuthRedirectError) return;
    document.getElementById("staff-table-body").innerHTML =
      `<tr><td colspan="5" class="data-table__error">Failed to load staff. Please refresh.</td></tr>`;
  }
}

function onEditStaff(id) {
  const s = allStaff.find((m) => m.id === id);
  if (!s) return;
  staffEditId = id;

  const f = document.getElementById("staff-form");
  f.reset();
  f.firstName.value = s.firstName ?? "";
  f.lastName.value  = s.lastName  ?? "";
  f.email.value     = s.email     ?? "";
  f.position.value  = s.position  ?? "";
  f.bio.value       = s.bio       ?? "";
  staffUploader.setExisting(s.imageUrl ?? null);

  document.getElementById("staff-modal-title").textContent = "Edit Staff Member";
  document.getElementById("staff-submit").textContent      = "Save Changes";
  clearGlobalErr("staff-form-error");
  clearFieldErrs("staff-fn-err", "staff-ln-err", "staff-email-err", "staff-pos-err", "staff-img-err");
  staffModal.open();
}

async function onDeleteStaff(id) {
  const s = allStaff.find((m) => m.id === id);
  if (!s) return;
  showConfirm({
    title: "Delete Staff Member",
    body:  `Are you sure you want to delete "${fullName(s)}"? This action cannot be undone.`,
    onConfirm: async () => {
      try {
        const res = await AuthState.apiFetch(`/api/admin/staff/${id}`, { method: "DELETE" });
        if (!res.ok) {
          const data = await res.json();
          showToast(data.error ?? "Failed to delete.", "error");
          return;
        }
        await loadStaff();
        showToast(`"${fullName(s)}" deleted.`);
      } catch (e) {
        if (!(e instanceof AuthRedirectError)) showToast("Network error — please try again.", "error");
      }
    },
  });
}

document.getElementById("staff-table-body").addEventListener("click", (e) => {
  const editBtn   = e.target.closest(".btn-action--edit");
  const deleteBtn = e.target.closest(".btn-action--delete");
  if (editBtn)   onEditStaff(+editBtn.dataset.id);
  if (deleteBtn) onDeleteStaff(+deleteBtn.dataset.id);
});

document.getElementById("add-staff-btn").addEventListener("click", () => {
  staffEditId = null;
  document.getElementById("staff-form").reset();
  staffUploader.reset();
  document.getElementById("staff-modal-title").textContent = "Add Staff Member";
  document.getElementById("staff-submit").textContent      = "Add Staff Member";
  clearGlobalErr("staff-form-error");
  clearFieldErrs("staff-fn-err", "staff-ln-err", "staff-email-err", "staff-pos-err", "staff-img-err");
  staffModal.open();
});
document.getElementById("staff-modal-close").addEventListener("click", () => staffModal.close());
document.getElementById("staff-cancel-btn").addEventListener("click",  () => staffModal.close());

document.getElementById("staff-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  clearGlobalErr("staff-form-error");
  clearFieldErrs("staff-fn-err", "staff-ln-err", "staff-email-err", "staff-pos-err", "staff-img-err");

  const f = e.target;
  let ok  = true;

  const firstName = f.firstName.value.trim();
  const lastName  = f.lastName.value.trim();
  const email     = f.email.value.trim();
  const position  = f.position.value.trim();
  const bio       = f.bio.value.trim();
  const imageUrl  = f.imageUrl.value.trim();

  if (!firstName) { fieldErr("staff-fn-err",    "First name is required"); ok = false; }
  if (!lastName)  { fieldErr("staff-ln-err",    "Last name is required");  ok = false; }
  if (!email)            { fieldErr("staff-email-err", "Email is required"); ok = false; }
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fieldErr("staff-email-err", "Enter a valid email address"); ok = false;
  }
  if (!position) { fieldErr("staff-pos-err", "Position is required"); ok = false; }
  if (!ok) return;

  const isEdit = staffEditId !== null;
  const label  = isEdit ? "Save Changes" : "Add Staff Member";
  const method = isEdit ? "PUT" : "POST";
  const path   = isEdit ? `/api/admin/staff/${staffEditId}` : "/api/admin/staff";

  setBusy("staff-submit", true, label);
  try {
    const res = await apiFetch(method, path, {
      firstName, lastName, email, position,
      bio:      bio      || null,
      imageUrl: imageUrl || null,
    });
    const data = await res.json();
    if (!res.ok) { globalErr("staff-form-error", data.error ?? "Something went wrong."); return; }
    staffModal.close();
    f.reset();
    staffUploader.reset();
    staffEditId = null;
    await loadStaff();
    showToast(isEdit ? "Staff member updated." : "Staff member added.");
  } catch (e) {
    if (!(e instanceof AuthRedirectError)) {
      globalErr("staff-form-error", "Network error — please try again.");
    }
  } finally {
    setBusy("staff-submit", false, label);
  }
});

/* ══════════════════════════════════════════════════════════════════
   MODULES
   ══════════════════════════════════════════════════════════════════ */
const moduleModal = new Modal("module-modal-bd");

function getStaffName(id) {
  const s = allStaff.find((m) => m.id === id);
  return s ? fullName(s) : "—";
}

function renderModules(modules) {
  const tbody = document.getElementById("modules-table-body");
  const empty = document.getElementById("modules-empty");

  if (!modules.length) {
    tbody.innerHTML = "";
    empty.hidden = false;
    return;
  }
  empty.hidden = true;
  tbody.innerHTML = modules.map((m) => `
    <tr>
      <td class="user-cell__name">${escHtml(m.title)}</td>
      <td class="data-table__secondary col-hide-mobile">${m.code ? escHtml(m.code) : "—"}</td>
      <td class="data-table__secondary col-hide-mobile">${m.moduleLeaderId ? escHtml(getStaffName(m.moduleLeaderId)) : "—"}</td>
      <td class="data-table__secondary col-hide-mobile">${formatDate(m.createdAt)}</td>
      <td class="col-actions">
        <div class="row-actions">
          <button class="btn-action btn-action--edit" data-id="${m.id}"
            aria-label="Edit ${escHtml(m.title)}">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <button class="btn-action btn-action--delete" data-id="${m.id}"
            aria-label="Delete ${escHtml(m.title)}">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <polyline points="3 6 5 6 21 6"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M10 11v6M14 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </td>
    </tr>`
  ).join("");
}

async function loadModules() {
  try {
    const res = await AuthState.apiFetch("/api/admin/modules");
    ({ modules: allModules } = await res.json());
    renderModules(allModules);
    updateStats();
    populateModulesPicker();
  } catch (e) {
    if (e instanceof AuthRedirectError) return;
    document.getElementById("modules-table-body").innerHTML =
      `<tr><td colspan="5" class="data-table__error">Failed to load modules. Please refresh.</td></tr>`;
  }
}

function onEditModule(id) {
  const m = allModules.find((mod) => mod.id === id);
  if (!m) return;
  moduleEditId = id;

  const f = document.getElementById("module-form");
  f.reset();
  f.title.value            = m.title            ?? "";
  f.code.value             = m.code             ?? "";
  f.shortDescription.value = m.shortDescription ?? "";
  f.description.value      = m.description      ?? "";
  f.moduleLeaderId.value   = m.moduleLeaderId   ?? "";
  moduleUploader.setExisting(m.imageUrl ?? null);

  document.getElementById("module-modal-title").textContent = "Edit Module";
  document.getElementById("module-submit").textContent      = "Save Changes";
  clearGlobalErr("module-form-error");
  clearFieldErrs("mod-title-err", "mod-code-err", "mod-desc-err", "mod-img-err");
  moduleModal.open();
}

async function onDeleteModule(id) {
  const m = allModules.find((mod) => mod.id === id);
  if (!m) return;
  showConfirm({
    title: "Delete Module",
    body:  `Are you sure you want to delete "${m.title}"? This action cannot be undone.`,
    onConfirm: async () => {
      try {
        const res = await AuthState.apiFetch(`/api/admin/modules/${id}`, { method: "DELETE" });
        if (!res.ok) {
          const data = await res.json();
          showToast(data.error ?? "Failed to delete.", "error");
          return;
        }
        await loadModules();
        showToast(`"${m.title}" deleted.`);
      } catch (e) {
        if (!(e instanceof AuthRedirectError)) showToast("Network error — please try again.", "error");
      }
    },
  });
}

document.getElementById("modules-table-body").addEventListener("click", (e) => {
  const editBtn   = e.target.closest(".btn-action--edit");
  const deleteBtn = e.target.closest(".btn-action--delete");
  if (editBtn)   onEditModule(+editBtn.dataset.id);
  if (deleteBtn) onDeleteModule(+deleteBtn.dataset.id);
});

document.getElementById("add-module-btn").addEventListener("click", () => {
  moduleEditId = null;
  document.getElementById("module-form").reset();
  moduleUploader.reset();
  document.getElementById("module-modal-title").textContent = "Add Module";
  document.getElementById("module-submit").textContent      = "Add Module";
  clearGlobalErr("module-form-error");
  clearFieldErrs("mod-title-err", "mod-code-err", "mod-desc-err", "mod-img-err");
  moduleModal.open();
});
document.getElementById("module-modal-close").addEventListener("click", () => moduleModal.close());
document.getElementById("module-cancel-btn").addEventListener("click",  () => moduleModal.close());

document.getElementById("module-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  clearGlobalErr("module-form-error");
  clearFieldErrs("mod-title-err", "mod-code-err", "mod-desc-err", "mod-img-err");

  const f = e.target;
  let ok  = true;

  const title            = f.title.value.trim();
  const code             = f.code.value.trim();
  const shortDescription = f.shortDescription.value.trim();
  const description      = f.description.value.trim();
  const imageUrl         = f.imageUrl.value.trim();
  const moduleLeaderId   = f.moduleLeaderId.value || null;

  if (!title)       { fieldErr("mod-title-err", "Title is required");       ok = false; }
  if (!description) { fieldErr("mod-desc-err",  "Description is required"); ok = false; }
  if (!ok) return;

  const isEdit = moduleEditId !== null;
  const label  = isEdit ? "Save Changes" : "Add Module";
  const method = isEdit ? "PUT" : "POST";
  const path   = isEdit ? `/api/admin/modules/${moduleEditId}` : "/api/admin/modules";

  setBusy("module-submit", true, label);
  try {
    const res = await apiFetch(method, path, {
      title,
      code:             code             || null,
      shortDescription: shortDescription || null,
      description,
      imageUrl:         imageUrl         || null,
      moduleLeaderId,
    });
    const data = await res.json();
    if (!res.ok) { globalErr("module-form-error", data.error ?? "Something went wrong."); return; }
    moduleModal.close();
    f.reset();
    moduleUploader.reset();
    moduleEditId = null;
    await loadModules();
    showToast(isEdit ? "Module updated." : "Module added.");
  } catch (e) {
    if (!(e instanceof AuthRedirectError)) {
      globalErr("module-form-error", "Network error — please try again.");
    }
  } finally {
    setBusy("module-submit", false, label);
  }
});

/* ══════════════════════════════════════════════════════════════════
   PROGRAMMES
   ══════════════════════════════════════════════════════════════════ */
function renderProgrammes(programmes) {
  const tbody = document.getElementById("programmes-table-body");
  const empty = document.getElementById("programmes-empty");

  if (!programmes.length) {
    tbody.innerHTML = "";
    empty.hidden = false;
    return;
  }
  empty.hidden = true;
  tbody.innerHTML = programmes.map((p) => {
    const lvlCls  = p.level === "POSTGRADUATE" ? "badge--pg" : "badge--ug";
    const lvlText = p.level === "POSTGRADUATE" ? "Postgraduate" : "Undergraduate";
    const pubBadge = p.isPublished
      ? `<span class="badge badge--published">Published</span>`
      : `<span class="badge badge--draft">Draft</span>`;
    return `
      <tr>
        <td class="user-cell__name">${escHtml(p.title)}</td>
        <td class="col-hide-mobile"><span class="badge ${lvlCls}">${lvlText}</span></td>
        <td class="data-table__secondary col-hide-mobile">${p.durationYears} yr${p.durationYears !== 1 ? "s" : ""}</td>
        <td>${pubBadge}</td>
        <td class="col-actions">
          <div class="row-actions">
            <button class="btn-action btn-action--edit" data-id="${p.id}"
              aria-label="Edit ${escHtml(p.title)}">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <button class="btn-action btn-action--delete" data-id="${p.id}"
              aria-label="Delete ${escHtml(p.title)}">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <polyline points="3 6 5 6 21 6"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M10 11v6M14 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
        </td>
      </tr>`;
  }).join("");
}

async function loadProgrammes() {
  try {
    const res = await AuthState.apiFetch("/api/admin/programmes");
    ({ programmes: allProgrammes } = await res.json());
    renderProgrammes(allProgrammes);
    updateStats();
  } catch (e) {
    if (e instanceof AuthRedirectError) return;
    document.getElementById("programmes-table-body").innerHTML =
      `<tr><td colspan="5" class="data-table__error">Failed to load programmes. Please refresh.</td></tr>`;
  }
}

const programmeModal = new Modal("programme-modal-bd");

function onEditProgramme(id) {
  const p = allProgrammes.find((x) => x.id === id);
  if (!p) return;
  programmeEditId = id;

  const f = document.getElementById("programme-form");
  f.reset();
  f.title.value             = p.title            ?? "";
  f.shortDescription.value  = p.shortDescription ?? "";
  f.description.value       = p.description      ?? "";
  f.level.value             = p.level            ?? "UNDERGRADUATE";
  f.durationYears.value     = p.durationYears    ?? 3;
  f.programmeLeaderId.value = p.programmeLeaderId ?? "";
  f.isPublished.checked     = Boolean(p.isPublished);
  progUploader.setExisting(p.imageUrl ?? null);
  populateModulesPicker(p.moduleIds ?? []);

  document.getElementById("programme-modal-title").textContent = "Edit Programme";
  document.getElementById("programme-submit").textContent      = "Save Changes";
  clearGlobalErr("programme-form-error");
  clearFieldErrs("prog-title-err", "prog-desc-err", "prog-dur-err", "prog-img-err");
  programmeModal.open();
}

async function onDeleteProgramme(id) {
  const p = allProgrammes.find((x) => x.id === id);
  if (!p) return;
  showConfirm({
    title: "Delete Programme",
    body:  `Are you sure you want to delete "${p.title}"? This action cannot be undone.`,
    onConfirm: async () => {
      try {
        const res = await AuthState.apiFetch(`/api/admin/programmes/${id}`, { method: "DELETE" });
        if (!res.ok) {
          const data = await res.json();
          showToast(data.error ?? "Failed to delete.", "error");
          return;
        }
        await loadProgrammes();
        showToast(`"${p.title}" deleted.`);
      } catch (e) {
        if (!(e instanceof AuthRedirectError)) showToast("Network error — please try again.", "error");
      }
    },
  });
}

document.getElementById("programmes-table-body").addEventListener("click", (e) => {
  const editBtn   = e.target.closest(".btn-action--edit");
  const deleteBtn = e.target.closest(".btn-action--delete");
  if (editBtn)   onEditProgramme(+editBtn.dataset.id);
  if (deleteBtn) onDeleteProgramme(+deleteBtn.dataset.id);
});

document.getElementById("add-programme-btn").addEventListener("click", () => {
  programmeEditId = null;
  document.getElementById("programme-form").reset();
  progUploader.reset();
  populateModulesPicker();
  document.getElementById("programme-modal-title").textContent = "Add Programme";
  document.getElementById("programme-submit").textContent      = "Add Programme";
  clearGlobalErr("programme-form-error");
  clearFieldErrs("prog-title-err", "prog-desc-err", "prog-dur-err", "prog-img-err");
  programmeModal.open();
});
document.getElementById("programme-modal-close").addEventListener("click", () => programmeModal.close());
document.getElementById("programme-cancel-btn").addEventListener("click",  () => programmeModal.close());

document.getElementById("programme-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  clearGlobalErr("programme-form-error");
  clearFieldErrs("prog-title-err", "prog-desc-err", "prog-dur-err", "prog-img-err");

  const f = e.target;
  let ok  = true;

  const title             = f.title.value.trim();
  const shortDescription  = f.shortDescription.value.trim();
  const description       = f.description.value.trim();
  const level             = f.level.value;
  const durationYears     = parseInt(f.durationYears.value, 10);
  const isPublished       = f.isPublished.checked;
  const programmeLeaderId = f.programmeLeaderId.value || null;
  const imageUrl          = f.imageUrl.value.trim();

  if (!title)       { fieldErr("prog-title-err", "Title is required");       ok = false; }
  if (!description) { fieldErr("prog-desc-err",  "Description is required"); ok = false; }
  if (!durationYears || durationYears < 1 || durationYears > 10) {
    fieldErr("prog-dur-err", "Duration must be between 1 and 10 years"); ok = false;
  }
  if (!ok) return;

  const moduleIds = [...document.querySelectorAll("#prog-modules-picker .modules-picker__checkbox:checked")]
    .map((cb) => Number(cb.value));

  const isEdit = programmeEditId !== null;
  const label  = isEdit ? "Save Changes" : "Add Programme";
  const method = isEdit ? "PUT" : "POST";
  const path   = isEdit ? `/api/admin/programmes/${programmeEditId}` : "/api/admin/programmes";

  setBusy("programme-submit", true, label);
  try {
    const res = await apiFetch(method, path, {
      title,
      shortDescription: shortDescription || null,
      description,
      level,
      durationYears,
      isPublished,
      programmeLeaderId,
      imageUrl: imageUrl || null,
      moduleIds,
    });
    const data = await res.json();
    if (!res.ok) { globalErr("programme-form-error", data.error ?? "Something went wrong."); return; }
    programmeModal.close();
    f.reset();
    progUploader.reset();
    programmeEditId = null;
    await loadProgrammes();
    if (isEdit) {
      showToast(`Programme "${data.programme.title}" updated.`);
    } else {
      showToast(`Programme "${data.programme.title}" added${isPublished ? " and published" : " as draft"}.`);
    }
  } catch (e) {
    if (!(e instanceof AuthRedirectError)) {
      globalErr("programme-form-error", "Network error — please try again.");
    }
  } finally {
    setBusy("programme-submit", false, label);
  }
});

function fieldErr(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}
function clearFieldErrs(...ids) {
  ids.forEach((id) => fieldErr(id, ""));
}
function globalErr(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.add("is-visible");
}
function clearGlobalErr(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = "";
  el.classList.remove("is-visible");
}
function setBusy(btnId, busy, label) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled    = busy;
  btn.textContent = busy ? "Saving…" : label;
}
function isValidHttpUrl(s) {
  return /^https?:\/\//i.test(s.trim());
}
// Thin wrapper around AuthState.apiFetch for JSON POST/PUT requests.
function apiFetch(method, path, body) {
  return AuthState.apiFetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
}

window.addEventListener("scroll", () => {
  document.getElementById("header").classList.toggle("is-scrolled", window.scrollY > 8);
}, { passive: true });

Promise.all([loadUsers(), loadStaff(), loadModules(), loadProgrammes()]);
