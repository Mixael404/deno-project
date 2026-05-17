import { userModel }    from "../models/userModel.js";
import { sessionModel } from "../models/sessionModel.js";
import { hashPassword, verifyPassword } from "../utils/hash.js";
import { createAccessToken, generateRefreshToken, refreshExpiresAt } from "../utils/jwt.js";
import { sanitizeName, sanitizeEmail, sanitizePhone, sanitizePassword, isValidEmail } from "../utils/sanitize.js";
import { getCookie, setAuthCookies, clearAuthCookies } from "../utils/cookies.js";

function json(data, status = 200, headers = new Headers()) {
  headers.set("content-type", "application/json");
  return new Response(JSON.stringify(data), { status, headers });
}

function safeUser(user) {
  const { passwordHash: _pw, ...rest } = user;
  return rest;
}

export const authController = {
  async register(req) {
    let body;
    try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

    const firstName = sanitizeName(body?.firstName);
    const lastName  = sanitizeName(body?.lastName);
    const email     = sanitizeEmail(body?.email);
    const password  = sanitizePassword(body?.password);
    const phone     = sanitizePhone(body?.phone);

    if (!firstName || !lastName || !email || !password) {
      return json({ error: "firstName, lastName, email and password are required" }, 400);
    }
    if (!isValidEmail(email)) {
      return json({ error: "Invalid email address" }, 400);
    }
    if (password.length < 8) {
      return json({ error: "Password must be at least 8 characters" }, 400);
    }
    if (userModel.findByEmail(email)) {
      return json({ error: "Email already in use" }, 409);
    }

    const passwordHash = await hashPassword(password);
    const user         = userModel.create({ email, passwordHash, role: "STUDENT", firstName, lastName, phone });
    const refreshToken = generateRefreshToken();
    const session      = sessionModel.create({ userId: user.id, refreshToken, expiresAt: refreshExpiresAt() });
    const accessToken  = await createAccessToken(user.id, user.role, session.id);

    const headers = new Headers();
    setAuthCookies(headers, accessToken, refreshToken);
    return json({ user: safeUser(user) }, 201, headers);
  },

  async login(req) {
    let body;
    try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

    const email    = sanitizeEmail(body?.email);
    const password = sanitizePassword(body?.password);

    if (!email || !password) {
      return json({ error: "email and password are required" }, 400);
    }

    const user = userModel.findByEmail(email);
    // Always run verifyPassword to prevent timing-based user enumeration.
    const isValidPw = await verifyPassword(password, user?.passwordHash ?? ":");
    if (!user || !isValidPw) {
      return json({ error: "Invalid credentials" }, 401);
    }

    const refreshToken = generateRefreshToken();
    const session      = sessionModel.create({ userId: user.id, refreshToken, expiresAt: refreshExpiresAt() });
    const accessToken  = await createAccessToken(user.id, user.role, session.id);

    const headers = new Headers();
    setAuthCookies(headers, accessToken, refreshToken);
    return json({ user: safeUser(user) }, 200, headers);
  },

  async refresh(req) {
    const refreshToken = getCookie(req, "refresh_token");
    if (!refreshToken) return json({ error: "No refresh token" }, 401);

    const session = sessionModel.findByRefreshToken(refreshToken);
    if (!session) return json({ error: "Invalid refresh token" }, 401);

    if (new Date(session.expiresAt) < new Date()) {
      sessionModel.remove(session.id);
      return json({ error: "Session expired. Please log in again." }, 401);
    }

    const user = userModel.findById(session.userId);
    if (!user) return json({ error: "User not found" }, 401);

    const newRefreshToken = generateRefreshToken();
    sessionModel.rotate(session.id, newRefreshToken, refreshExpiresAt());
    const accessToken = await createAccessToken(user.id, user.role, session.id);

    const headers = new Headers();
    setAuthCookies(headers, accessToken, newRefreshToken);
    return json({ ok: true }, 200, headers);
  },

  async logout(req) {
    const refreshToken = getCookie(req, "refresh_token");
    if (refreshToken) sessionModel.removeByRefreshToken(refreshToken);

    const headers = new Headers();
    clearAuthCookies(headers);
    return json({ ok: true }, 200, headers);
  },
};
