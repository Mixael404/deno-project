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
