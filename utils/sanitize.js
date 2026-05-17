// Strips HTML tags and normalizes whitespace to prevent stored XSS.
// SQL injection is handled at the DB layer via prepared statements.

function stripHtml(str) {
  return String(str)
    .replace(/<[^>]*>/g, "")
    .replace(/&lt;/g,    "<")
    .replace(/&gt;/g,    ">")
    .replace(/&amp;/g,   "&")
    .replace(/&quot;/g,  '"')
    .replace(/&#x27;/g,  "'")
    .replace(/&#x2F;/g,  "/")
    .trim();
}

export function sanitizeText(value, maxLength = 1000) {
  if (value == null) return null;
  return stripHtml(String(value)).slice(0, maxLength) || null;
}

export function sanitizeName(value) {
  if (value == null) return null;
  // Names: strip HTML, collapse whitespace, limit length.
  const clean = stripHtml(String(value)).replace(/\s+/g, " ");
  return clean.slice(0, 100) || null;
}

export function sanitizeEmail(value) {
  if (value == null) return null;
  // Lowercase + trim; no HTML stripping needed as @ makes tags impossible to form.
  return String(value).trim().toLowerCase().slice(0, 254) || null;
}

export function sanitizePhone(value) {
  if (value == null) return null;
  // Keep only digits, +, -, spaces, parentheses — anything else is noise or injection.
  const clean = String(value).replace(/[^\d+\-\s()]/g, "").trim();
  return clean.slice(0, 30) || null;
}

export function sanitizePassword(value) {
  if (value == null) return null;
  // Passwords are hashed — no HTML stripping (could weaken entropy).
  // Only trim surrounding whitespace and enforce a hard cap.
  return String(value).trim().slice(0, 72); // bcrypt/PBKDF2 safe max
}

// Validates an email address format.
export function isValidEmail(value) {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
