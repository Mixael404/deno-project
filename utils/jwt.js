// HS256 JWT + refresh token utils — no external dependencies (Web Crypto API).

const SECRET      = Deno.env.get("JWT_SECRET") ?? "dev_secret_change_in_production";
const ACCESS_TTL  = 15 * 60;          // 15 minutes
const REFRESH_TTL = 30 * 24 * 3600;  // 30 days

/* ── Base64url helpers ─────────────────────────────────────── */
function b64url(input) {
  const bytes = typeof input === "string"
    ? new TextEncoder().encode(input)
    : new Uint8Array(input);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function b64urlDecode(str) {
  const padded = str + "===".slice((str.length + 3) % 4);
  return atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
}

/* ── HMAC-SHA256 signing key ───────────────────────────────── */
function signingKey() {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/* ── Access token ──────────────────────────────────────────── */
export async function createAccessToken(userId, role, sessionId) {
  const header  = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify({
    sub:       String(userId),
    role,
    sessionId: Number(sessionId),
    iat:       Math.floor(Date.now() / 1000),
    exp:       Math.floor(Date.now() / 1000) + ACCESS_TTL,
  }));

  const data = `${header}.${payload}`;
  const key  = await signingKey();
  const sig  = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));

  return `${data}.${b64url(sig)}`;
}

export async function verifyAccessToken(token) {
  const parts = token?.split(".");
  if (parts?.length !== 3) throw new Error("Malformed token");

  const [header, payload, sig] = parts;
  const key      = await signingKey();
  const sigBytes = Uint8Array.from(b64urlDecode(sig), (c) => c.charCodeAt(0));

  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    sigBytes,
    new TextEncoder().encode(`${header}.${payload}`),
  );
  if (!valid) throw new Error("Invalid signature");

  const claims = JSON.parse(b64urlDecode(payload));
  if (claims.exp < Math.floor(Date.now() / 1000)) throw new Error("Token expired");

  return claims; // { sub, role, sessionId, iat, exp }
}

/* ── Refresh token ─────────────────────────────────────────── */
export function generateRefreshToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function refreshExpiresAt() {
  return new Date(Date.now() + REFRESH_TTL * 1000).toISOString();
}
