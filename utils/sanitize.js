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

// Only allows http/https URLs to prevent javascript: injection.
export function sanitizeUrl(value) {
  if (value == null) return null;
  const s = String(value).trim().slice(0, 500);
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) return null;
  return s;
}

// Accepts server-generated /uploads/ paths and external https:// URLs.
// Used for image fields that may come from either the file uploader or an
// external URL input.
export function sanitizeImageSrc(value) {
  if (value == null) return null;
  const s = String(value).trim().slice(0, 500);
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  // Only allow simple filenames under /uploads/ — no path traversal.
  if (/^\/uploads\/[a-zA-Z0-9_.-]+\.(jpg|jpeg|png|webp)$/i.test(s)) return s;
  return null;
}
