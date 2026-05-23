import { interestRegistrationModel } from "../models/contactRequestModel.js";
import { programmeModel }            from "../models/programmeModel.js";
import {
  sanitizeName,
  sanitizeEmail,
  sanitizePhone,
  sanitizeText,
  isValidEmail,
} from "../utils/sanitize.js";

function json(data, status = 200) {
  return Response.json(data, { status });
}

export const contactController = {
  async submit(req) {
    let body;
    try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

    const firstName   = sanitizeName(body.firstName);
    const lastName    = sanitizeName(body.lastName);
    const email       = sanitizeEmail(body.email);
    const phone       = body.phone    ? sanitizePhone(body.phone)      : null;
    const message     = body.message  ? sanitizeText(body.message, 2000) : null;
    const programmeId = Number(body.programmeId);

    if (!firstName)               return json({ error: "First name is required" }, 400);
    if (!lastName)                return json({ error: "Last name is required" }, 400);
    if (!email || !isValidEmail(email)) return json({ error: "Valid email is required" }, 400);
    if (!programmeId)             return json({ error: "Programme is required" }, 400);

    const programme = programmeModel.findById(programmeId);
    if (!programme || !programme.isPublished) return json({ error: "Programme not found" }, 404);

    interestRegistrationModel.create({ firstName, lastName, email, phone, programmeId, message });
    return json({ ok: true }, 201);
  },
};
