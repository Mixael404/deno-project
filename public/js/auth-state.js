"use strict";

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
    const adminBtn  = document.getElementById("admin-btn");
    const avatar    = document.getElementById("user-avatar");

    const initials = user ? getInitials(user) : "";

    if (user && initials) {
      authBtn?.setAttribute("hidden", "");
      avatarBtn?.removeAttribute("hidden");
      if (avatar) avatar.textContent = initials;
      if (user.role === "ADMIN") adminBtn?.removeAttribute("hidden");
      else adminBtn?.setAttribute("hidden", "");
    } else {
      authBtn?.removeAttribute("hidden");
      avatarBtn?.setAttribute("hidden", "");
      adminBtn?.setAttribute("hidden", "");
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

  class AuthRedirectError extends Error {
    constructor() { super("auth-redirect"); this.name = "AuthRedirectError"; }
  }

  let _refreshing = null;

  async function tryRefresh() {
    if (_refreshing) return _refreshing;
    _refreshing = fetch("/api/auth/refresh", { method: "POST", credentials: "include" })
      .then((r) => {
        if (!r.ok) { clearUser(); return false; }
        return true;
      })
      .catch(() => { clearUser(); return false; })
      .finally(() => { _refreshing = null; });
    return _refreshing;
  }

  async function apiFetch(input, init = {}) {
    const opts = { ...init, credentials: "include" };
    let res = await fetch(input, opts);

    if (res.status === 401) {
      const refreshed = await tryRefresh();
      if (!refreshed) {
        window.location.replace("/");
        throw new AuthRedirectError();
      }
      res = await fetch(input, opts);
      // Second 401 after a successful refresh means the server rejected the
      if (res.status === 401) {
        clearUser();
        window.location.replace("/");
        throw new AuthRedirectError();
      }
    }

    // 403 = authenticated but not authorised — no point refreshing.
    if (res.status === 403) {
      clearUser();
      window.location.replace("/");
      throw new AuthRedirectError();
    }

    return res;
  }

  window.AuthState = {
    getUser,
    setUser,
    clearUser,
    getInitials,
    applyHeaderAuthState,
    authFetch,
    apiFetch,
    logout,
  };
  window.AuthRedirectError = AuthRedirectError;

  applyHeaderAuthState();
})();
