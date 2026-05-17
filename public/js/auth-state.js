"use strict";

/* ══════════════════════════════════════════════════════
   AUTH STATE  — shared across all pages
   User data lives in localStorage; tokens in HTTP-only cookies.
   Exposed as window.AuthState (plain script, not ES module).
   ══════════════════════════════════════════════════════ */

(function () {
  const USER_KEY = "dmp_user";

  function getUser() {
    try {
      const raw = localStorage.getItem(USER_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || !parsed.email) return null;
      return parsed;
    } catch { return null; }
  }

  function setUser(user) {
    try { localStorage.setItem(USER_KEY, JSON.stringify(user)); } catch { /* storage blocked */ }
  }

  function clearUser() {
    try { localStorage.removeItem(USER_KEY); } catch { /* storage blocked */ }
  }

  function getInitials(user) {
    const firstName = user.firstName?.[0] ?? "";
    const lastName  = user.lastName?.[0]  ?? "";
    const combined  = (firstName + lastName).trim().toUpperCase();
    if (combined) return combined;
    return user.email[0].toUpperCase();
  }

  function applyHeaderAuthState() {
    const user      = getUser();
    const authBtn   = document.getElementById("auth-btn");
    const avatarBtn = document.getElementById("avatar-btn");
    const avatar    = document.getElementById("user-avatar");

    const initials = user ? getInitials(user) : "";

    if (user && initials) {
      authBtn?.setAttribute("hidden", "");
      avatarBtn?.removeAttribute("hidden");
      if (avatar) avatar.textContent = initials;
    } else {
      authBtn?.removeAttribute("hidden");
      avatarBtn?.setAttribute("hidden", "");
      if (!user) clearUser();
    }
  }

  async function authFetch(path, body) {
    const res = await fetch(path, {
      method:      "POST",
      credentials: "include",
      headers:     { "Content-Type": "application/json" },
      body:        JSON.stringify(body),
    });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  }

  async function logout() {
    await authFetch("/api/auth/logout", {});
    clearUser();
    window.location.href = "/";
  }

  window.AuthState = { getUser, setUser, clearUser, getInitials, applyHeaderAuthState, authFetch, logout };

  applyHeaderAuthState();
})();
