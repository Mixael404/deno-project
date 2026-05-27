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
  const clean = stripHtml(String(value)).replace(/\s+/g, " ");
  return clean.slice(0, 100) || null;
}

export function sanitizeEmail(value) {
  if (value == null) return null;
  return String(value).trim().toLowerCase().slice(0, 254) || null;
}

export function sanitizePhone(value) {
  if (value == null) return null;
  const clean = String(value).replace(/[^\d+\-\s()]/g, "").trim();
  return clean.slice(0, 30) || null;
}

export function sanitizePassword(value) {
  if (value == null) return null;
  return String(value).trim().slice(0, 72);
}

export function isValidEmail(value) {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function sanitizeUrl(value) {
  if (value == null) return null;
  const s = String(value).trim().slice(0, 500);
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) return null;
  return s;
}

export function sanitizeImageSrc(value) {
  if (value == null) return null;
  const s = String(value).trim().slice(0, 500);
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  if (/^\/uploads\/[a-zA-Z0-9_.-]+\.(jpg|jpeg|png|webp)$/i.test(s)) return s;
  return null;
}
