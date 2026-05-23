"use strict";

const user = AuthState.getUser();

if (!user) {
  window.location.replace("/");
}

function formatDate(isoString) {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleDateString("en-GB", {
    year: "numeric", month: "long", day: "numeric",
  });
}

function initials(u) {
  const f = u.firstName?.[0] ?? "";
  const l = u.lastName?.[0]  ?? "";
  return (f + l).toUpperCase() || u.email[0].toUpperCase();
}

if (user) {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;

  document.getElementById("profile-avatar-lg").textContent = initials(user);
  document.getElementById("profile-name").textContent      = fullName;
  document.getElementById("profile-role").textContent      = user.role ?? "STUDENT";
  document.getElementById("profile-email").textContent     = user.email;
  document.getElementById("profile-created").textContent   = formatDate(user.createdAt);
  document.title = `${fullName} — De Montfort Programmes`;

  if (user.phone) {
    const phoneRow = document.getElementById("profile-phone-row");
    document.getElementById("profile-phone").textContent = user.phone;
    phoneRow.removeAttribute("hidden");
  }
}

document.getElementById("logout-btn").addEventListener("click", AuthState.logout);

if (user && user.role !== "ADMIN") {
  loadSubscriptions();
}

async function loadSubscriptions() {
  const section = document.getElementById("subscriptions-section");
  const list    = document.getElementById("subscriptions-list");

  try {
    const res  = await AuthState.apiFetch("/api/subscriptions");
    const data = await res.json();
    const subs = data.subscriptions ?? [];

    if (!subs.length) {
      section.removeAttribute("hidden");
      list.innerHTML = `<li class="subscription-item subscription-item--empty">You are not tracking any programmes yet.</li>`;
      return;
    }

    section.removeAttribute("hidden");
    list.innerHTML = subs.map((s) => {
      const p    = s.programme;
      const name = p ? escHtml(p.title) : `Programme #${s.programmeId}`;
      const lvl  = p ? `<span class="subscription-item__level">${escHtml(p.level.charAt(0) + p.level.slice(1).toLowerCase())}</span>` : "";
      return `
        <li class="subscription-item" id="sub-item-${s.programmeId}">
          <div class="subscription-item__info">
            <span class="subscription-item__title">${name}</span>
            ${lvl}
          </div>
          <button class="btn btn--sm btn--cancel" data-programme-id="${s.programmeId}" aria-label="Unsubscribe from ${name}">
            Unsubscribe
          </button>
        </li>`;
    }).join("");

    list.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-programme-id]");
      if (!btn) return;
      const programmeId = Number(btn.dataset.programmeId);
      btn.disabled = true;
      btn.textContent = "Removing…";

      try {
        const res = await AuthState.apiFetch(`/api/subscriptions/${programmeId}`, { method: "DELETE" });
        if (res.ok) {
          const item = document.getElementById(`sub-item-${programmeId}`);
          item?.remove();
          if (!list.querySelector(".subscription-item")) {
            list.innerHTML = `<li class="subscription-item subscription-item--empty">You are not tracking any programmes yet.</li>`;
          }
        } else {
          btn.disabled = false;
          btn.textContent = "Unsubscribe";
        }
      } catch (err) {
        if (!(err instanceof AuthRedirectError)) {
          btn.disabled = false;
          btn.textContent = "Unsubscribe";
        }
      }
    });
  } catch (err) {
    if (!(err instanceof AuthRedirectError)) {
      section.removeAttribute("hidden");
      list.innerHTML = `<li class="subscription-item subscription-item--empty">Failed to load subscriptions.</li>`;
    }
  }
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
