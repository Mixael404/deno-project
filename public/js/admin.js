"use strict";

/* Redirect immediately if not an admin */
const me = AuthState.getUser();
if (!me || me.role !== "ADMIN") {
  window.location.replace("/");
}

/* ── Helpers ─────────────────────────────────────────────────────── */
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

function initials(user) {
  const f = user.firstName?.[0] ?? "";
  const l = user.lastName?.[0]  ?? "";
  return (f + l).toUpperCase() || user.email[0].toUpperCase();
}

function fullName(user) {
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || "—";
}

/* ── Render ──────────────────────────────────────────────────────── */
let allUsers = [];

function renderStats(users) {
  const students = users.filter((u) => u.role === "STUDENT").length;
  const admins   = users.filter((u) => u.role === "ADMIN").length;
  document.getElementById("stat-total").textContent    = users.length;
  document.getElementById("stat-students").textContent = students;
  document.getElementById("stat-admins").textContent   = admins;
}

function renderRows(users) {
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
        <td class="data-table__secondary">${formatDate(u.createdAt)}</td>
      </tr>`;
  }).join("");
}

function applySearch(query) {
  const q = query.toLowerCase().trim();
  if (!q) { renderRows(allUsers); return; }
  renderRows(allUsers.filter((u) =>
    fullName(u).toLowerCase().includes(q) ||
    u.email.toLowerCase().includes(q)
  ));
}

/* ── Fetch ───────────────────────────────────────────────────────── */
async function loadUsers() {
  try {
    const res = await fetch("/api/admin/users", { credentials: "include" });
    if (res.status === 401 || res.status === 403) {
      window.location.replace("/");
      return;
    }
    const { users } = await res.json();
    allUsers = users;
    renderStats(users);
    renderRows(users);
  } catch {
    document.getElementById("users-table-body").innerHTML =
      `<tr><td colspan="4" class="data-table__error">Failed to load users. Please refresh.</td></tr>`;
  }
}

/* ── Events ──────────────────────────────────────────────────────── */
document.getElementById("user-search").addEventListener("input", (e) => {
  applySearch(e.target.value);
});

window.addEventListener("scroll", () => {
  document.getElementById("header")
    .classList.toggle("is-scrolled", window.scrollY > 8);
}, { passive: true });

/* ── Init ────────────────────────────────────────────────────────── */
loadUsers();
