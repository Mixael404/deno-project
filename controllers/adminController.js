import { userModel }             from "../models/userModel.js";
import { staffMemberModel }      from "../models/staffMemberModel.js";
import { moduleModel }           from "../models/moduleModel.js";
import { programmeModel }        from "../models/programmeModel.js";
import { programmeModuleModel }  from "../models/programmeModuleModel.js";
import { verifyAccessToken } from "../utils/jwt.js";
import { getCookie }         from "../utils/cookies.js";
import { saveUpload }        from "../utils/upload.js";
import {
  sanitizeName,
  sanitizeEmail,
  sanitizeText,
  sanitizeUrl,
  sanitizeImageSrc,
  isValidEmail,
} from "../utils/sanitize.js";
import { removeUpload } from "../utils/upload.js";

function json(data, status = 200) {
  return Response.json(data, { status });
}

// Returns [claims, null] on success.
// Returns [null, 401] when token is missing or expired (client should refresh).
// Returns [null, 403] when token is valid but role is not ADMIN.
async function requireAdmin(req) {
  const token = getCookie(req, "access_token");
  if (!token) return [null, 401];
  try {
    const claims = await verifyAccessToken(token);
    return claims.role === "ADMIN" ? [claims, null] : [null, 403];
  } catch {
    return [null, 401];
  }
}

function toSlug(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function uniqueSlug(base, existsFn) {
  if (!existsFn(base)) return base;
  for (let n = 2; n <= 100; n++) {
    const candidate = `${base}-${n}`;
    if (!existsFn(candidate)) return candidate;
  }
  return `${base}-${Date.now()}`;
}

export const adminController = {
  // ── Image upload ───────────────────────────────────────────────
  async uploadImage(req) {
    const [, authErr] = await requireAdmin(req);
    if (authErr) return json({ error: authErr === 401 ? "Unauthorized" : "Forbidden" }, authErr);

    let formData;
    try { formData = await req.formData(); }
    catch { return json({ error: "Invalid multipart data" }, 400); }

    const file = formData.get("file");
    if (!file || !(file instanceof File)) return json({ error: "No file provided" }, 400);

    try {
      const url = await saveUpload(file);
      return json({ url });
    } catch (err) {
      return json({ error: err.message }, 400);
    }
  },

  // ── Users ──────────────────────────────────────────────────────
  async getUsers(req) {
    const [claims, authErr] = await requireAdmin(req);
    if (authErr) return json({ error: authErr === 401 ? "Unauthorized" : "Forbidden" }, authErr);
    const users = userModel.findAll().map(({ passwordHash: _, ...u }) => u);
    return json({ users });
  },

  // ── Staff ───────────────────────────────────────────────────────
  async listStaff(req) {
    const [, authErr] = await requireAdmin(req);
    if (authErr) return json({ error: authErr === 401 ? "Unauthorized" : "Forbidden" }, authErr);
    return json({ staff: staffMemberModel.findAll() });
  },

  async createStaff(req) {
    const [, authErr] = await requireAdmin(req);
    if (authErr) return json({ error: authErr === 401 ? "Unauthorized" : "Forbidden" }, authErr);

    let body;
    try { body = await req.json(); }
    catch { return json({ error: "Invalid JSON" }, 400); }

    const firstName = sanitizeName(body.firstName);
    const lastName  = sanitizeName(body.lastName);
    const email     = sanitizeEmail(body.email);
    const position  = sanitizeText(body.position, 200);
    const bio       = sanitizeText(body.bio, 2000);
    const imageUrl  = sanitizeImageSrc(body.imageUrl);

    if (!firstName)           return json({ error: "First name is required" }, 400);
    if (!lastName)            return json({ error: "Last name is required" }, 400);
    if (!email)               return json({ error: "Email is required" }, 400);
    if (!isValidEmail(email)) return json({ error: "Invalid email address" }, 400);
    if (!position)            return json({ error: "Position is required" }, 400);

    if (staffMemberModel.findByEmail(email)) {
      return json({ error: "A staff member with this email already exists" }, 409);
    }

    const member = staffMemberModel.create({ firstName, lastName, email, position, bio, imageUrl });
    return json({ member }, 201);
  },

  async updateStaff(req, id) {
    const [, authErr] = await requireAdmin(req);
    if (authErr) return json({ error: authErr === 401 ? "Unauthorized" : "Forbidden" }, authErr);

    const existing = staffMemberModel.findById(id);
    if (!existing) return json({ error: "Staff member not found" }, 404);

    let body;
    try { body = await req.json(); }
    catch { return json({ error: "Invalid JSON" }, 400); }

    const firstName = sanitizeName(body.firstName);
    const lastName  = sanitizeName(body.lastName);
    const email     = sanitizeEmail(body.email);
    const position  = sanitizeText(body.position, 200);
    const bio       = "bio" in body ? sanitizeText(body.bio, 2000) : undefined;
    const imageUrl  = "imageUrl" in body ? sanitizeImageSrc(body.imageUrl) : undefined;

    if (!firstName)           return json({ error: "First name is required" }, 400);
    if (!lastName)            return json({ error: "Last name is required" }, 400);
    if (!email)               return json({ error: "Email is required" }, 400);
    if (!isValidEmail(email)) return json({ error: "Invalid email address" }, 400);
    if (!position)            return json({ error: "Position is required" }, 400);

    if (email !== existing.email) {
      const conflict = staffMemberModel.findByEmail(email);
      if (conflict && conflict.id !== id) {
        return json({ error: "A staff member with this email already exists" }, 409);
      }
    }

    // Remove old uploaded image when replaced with a different one
    if (imageUrl !== undefined && existing.imageUrl && existing.imageUrl !== imageUrl &&
        existing.imageUrl.startsWith("/uploads/")) {
      try { await removeUpload(existing.imageUrl); } catch { /* best-effort */ }
    }

    const member = staffMemberModel.update(id, { firstName, lastName, email, position, bio, imageUrl });
    return json({ member });
  },

  async deleteStaff(req, id) {
    const [, authErr] = await requireAdmin(req);
    if (authErr) return json({ error: authErr === 401 ? "Unauthorized" : "Forbidden" }, authErr);

    const existing = staffMemberModel.findById(id);
    if (!existing) return json({ error: "Staff member not found" }, 404);

    if (existing.imageUrl?.startsWith("/uploads/")) {
      try { await removeUpload(existing.imageUrl); } catch { /* best-effort */ }
    }
    staffMemberModel.remove(id);
    return json({ ok: true });
  },

  // ── Modules ─────────────────────────────────────────────────────
  async listModules(req) {
    const [, authErr] = await requireAdmin(req);
    if (authErr) return json({ error: authErr === 401 ? "Unauthorized" : "Forbidden" }, authErr);
    return json({ modules: moduleModel.findAll() });
  },

  async createModule(req) {
    const [, authErr] = await requireAdmin(req);
    if (authErr) return json({ error: authErr === 401 ? "Unauthorized" : "Forbidden" }, authErr);

    let body;
    try { body = await req.json(); }
    catch { return json({ error: "Invalid JSON" }, 400); }

    const title            = sanitizeText(body.title, 200);
    const rawCode          = body.code ? sanitizeText(body.code, 20) : null;
    const code             = rawCode ? rawCode.toUpperCase() : null;
    const shortDescription = body.shortDescription ? sanitizeText(body.shortDescription, 500) : null;
    const description      = sanitizeText(body.description, 5000);
    const imageUrl         = sanitizeImageSrc(body.imageUrl);
    const moduleLeaderId   = body.moduleLeaderId ? (Number(body.moduleLeaderId) || null) : null;

    if (!title)       return json({ error: "Title is required" }, 400);
    if (!description) return json({ error: "Description is required" }, 400);

    if (code && moduleModel.findByCode(code)) {
      return json({ error: "A module with this code already exists" }, 409);
    }

    const baseSlug = toSlug(title);
    const slug     = uniqueSlug(baseSlug, (s) => !!moduleModel.findBySlug(s));

    const mod = moduleModel.create({ title, code, slug, shortDescription, description, imageUrl, moduleLeaderId });
    return json({ module: mod }, 201);
  },

  async updateModule(req, id) {
    const [, authErr] = await requireAdmin(req);
    if (authErr) return json({ error: authErr === 401 ? "Unauthorized" : "Forbidden" }, authErr);

    const existing = moduleModel.findById(id);
    if (!existing) return json({ error: "Module not found" }, 404);

    let body;
    try { body = await req.json(); }
    catch { return json({ error: "Invalid JSON" }, 400); }

    const title            = sanitizeText(body.title, 200);
    const rawCode          = "code" in body ? (body.code ? sanitizeText(body.code, 20) : null) : undefined;
    const code             = rawCode !== undefined ? (rawCode ? rawCode.toUpperCase() : null) : undefined;
    const shortDescription = "shortDescription" in body
      ? sanitizeText(body.shortDescription, 500) : undefined;
    const description      = sanitizeText(body.description, 5000);
    const imageUrl         = "imageUrl" in body ? sanitizeImageSrc(body.imageUrl) : undefined;
    const moduleLeaderId   = "moduleLeaderId" in body
      ? (body.moduleLeaderId ? (Number(body.moduleLeaderId) || null) : null) : undefined;

    if (!title)       return json({ error: "Title is required" }, 400);
    if (!description) return json({ error: "Description is required" }, 400);

    if (code !== undefined && code && code !== existing.code && moduleModel.findByCode(code)) {
      return json({ error: "A module with this code already exists" }, 409);
    }

    if (imageUrl !== undefined && existing.imageUrl && existing.imageUrl !== imageUrl &&
        existing.imageUrl.startsWith("/uploads/")) {
      try { await removeUpload(existing.imageUrl); } catch { /* best-effort */ }
    }

    const mod = moduleModel.update(id, { title, code, shortDescription, description, imageUrl, moduleLeaderId });
    return json({ module: mod });
  },

  async deleteModule(req, id) {
    const [, authErr] = await requireAdmin(req);
    if (authErr) return json({ error: authErr === 401 ? "Unauthorized" : "Forbidden" }, authErr);

    const existing = moduleModel.findById(id);
    if (!existing) return json({ error: "Module not found" }, 404);

    if (existing.imageUrl?.startsWith("/uploads/")) {
      try { await removeUpload(existing.imageUrl); } catch { /* best-effort */ }
    }
    moduleModel.remove(id);
    return json({ ok: true });
  },

  // ── Programmes ──────────────────────────────────────────────────
  async listProgrammes(req) {
    const [, authErr] = await requireAdmin(req);
    if (authErr) return json({ error: authErr === 401 ? "Unauthorized" : "Forbidden" }, authErr);
    const programmes = programmeModel.findAll().map((p) => ({
      ...p,
      moduleIds: programmeModuleModel.findByProgramme(p.id).map((pm) => pm.moduleId),
    }));
    return json({ programmes });
  },

  async createProgramme(req) {
    const [, authErr] = await requireAdmin(req);
    if (authErr) return json({ error: authErr === 401 ? "Unauthorized" : "Forbidden" }, authErr);

    let body;
    try { body = await req.json(); }
    catch { return json({ error: "Invalid JSON" }, 400); }

    const title             = sanitizeText(body.title, 200);
    const shortDescription  = body.shortDescription ? sanitizeText(body.shortDescription, 500) : null;
    const description       = sanitizeText(body.description, 5000);
    const level             = body.level === "POSTGRADUATE" ? "POSTGRADUATE" : "UNDERGRADUATE";
    const durationYears     = Math.max(1, Math.min(10, Number(body.durationYears) || 3));
    const isPublished       = Boolean(body.isPublished);
    const programmeLeaderId = body.programmeLeaderId ? (Number(body.programmeLeaderId) || null) : null;
    const imageUrl          = sanitizeImageSrc(body.imageUrl);

    if (!title)       return json({ error: "Title is required" }, 400);
    if (!description) return json({ error: "Description is required" }, 400);

    const baseSlug  = toSlug(title);
    const slug      = uniqueSlug(baseSlug, (s) => !!programmeModel.findBySlug(s));

    const moduleIds = Array.isArray(body.moduleIds)
      ? body.moduleIds.map(Number).filter((n) => n > 0)
      : [];

    const programme = programmeModel.create({
      title, slug, shortDescription, description, level, imageUrl,
      durationYears, isPublished, programmeLeaderId,
    });
    for (let i = 0; i < moduleIds.length; i++) {
      programmeModuleModel.create({ programmeId: programme.id, moduleId: moduleIds[i], year: 1, sortOrder: i });
    }
    return json({ programme }, 201);
  },

  async updateProgramme(req, id) {
    const [, authErr] = await requireAdmin(req);
    if (authErr) return json({ error: authErr === 401 ? "Unauthorized" : "Forbidden" }, authErr);

    const existing = programmeModel.findById(id);
    if (!existing) return json({ error: "Programme not found" }, 404);

    let body;
    try { body = await req.json(); }
    catch { return json({ error: "Invalid JSON" }, 400); }

    const title             = sanitizeText(body.title, 200);
    const shortDescription  = "shortDescription" in body ? sanitizeText(body.shortDescription, 500) : undefined;
    const description       = sanitizeText(body.description, 5000);
    const level             = body.level === "POSTGRADUATE" ? "POSTGRADUATE" : "UNDERGRADUATE";
    const durationYears     = Math.max(1, Math.min(10, Number(body.durationYears) || 3));
    const isPublished       = Boolean(body.isPublished);
    const programmeLeaderId = body.programmeLeaderId ? (Number(body.programmeLeaderId) || null) : null;
    const imageUrl          = "imageUrl" in body ? sanitizeImageSrc(body.imageUrl) : undefined;

    if (!title)       return json({ error: "Title is required" }, 400);
    if (!description) return json({ error: "Description is required" }, 400);

    if (imageUrl !== undefined && existing.imageUrl && existing.imageUrl !== imageUrl &&
        existing.imageUrl.startsWith("/uploads/")) {
      try { await removeUpload(existing.imageUrl); } catch { /* best-effort */ }
    }

    const moduleIds = Array.isArray(body.moduleIds)
      ? body.moduleIds.map(Number).filter((n) => n > 0)
      : [];

    const programme = programmeModel.update(id, {
      title, shortDescription, description, level, imageUrl,
      durationYears, isPublished, programmeLeaderId,
    });
    programmeModuleModel.removeByProgramme(id);
    for (let i = 0; i < moduleIds.length; i++) {
      programmeModuleModel.create({ programmeId: id, moduleId: moduleIds[i], year: 1, sortOrder: i });
    }
    return json({ programme });
  },

  async deleteProgramme(req, id) {
    const [, authErr] = await requireAdmin(req);
    if (authErr) return json({ error: authErr === 401 ? "Unauthorized" : "Forbidden" }, authErr);

    const existing = programmeModel.findById(id);
    if (!existing) return json({ error: "Programme not found" }, 404);

    if (existing.imageUrl?.startsWith("/uploads/")) {
      try { await removeUpload(existing.imageUrl); } catch { /* best-effort */ }
    }
    programmeModel.remove(id);
    return json({ ok: true });
  },
};
