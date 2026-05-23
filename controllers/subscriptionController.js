import { programmeInterestModel } from "../models/programmeSubscriptionModel.js";
import { programmeModel }         from "../models/programmeModel.js";
import { verifyAccessToken }      from "../utils/jwt.js";
import { getCookie }              from "../utils/cookies.js";

function json(data, status = 200) {
  return Response.json(data, { status });
}

async function requireAuth(req) {
  const token = getCookie(req, "access_token");
  if (!token) return [null, 401];
  try {
    const claims = await verifyAccessToken(token);
    return [claims, null];
  } catch {
    return [null, 401];
  }
}

export const subscriptionController = {
  async list(req) {
    const [claims, err] = await requireAuth(req);
    if (err) return json({ error: "Unauthorized" }, err);

    const subs = programmeInterestModel.findByUser(Number(claims.sub));
    const subscriptions = subs.map((s) => ({
      ...s,
      programme: programmeModel.findById(s.programmeId) ?? null,
    }));
    return json({ subscriptions });
  },

  async subscribe(req) {
    const [claims, err] = await requireAuth(req);
    if (err) return json({ error: "Unauthorized" }, err);

    let body;
    try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

    const programmeId = Number(body.programmeId);
    if (!programmeId) return json({ error: "programmeId required" }, 400);

    const programme = programmeModel.findById(programmeId);
    if (!programme || !programme.isPublished) return json({ error: "Programme not found" }, 404);

    const existing = programmeInterestModel.findByUserAndProgramme(Number(claims.sub), programmeId);
    if (existing) return json({ error: "Already subscribed" }, 409);

    const sub = programmeInterestModel.create({ userId: Number(claims.sub), programmeId });
    return json({ subscription: sub }, 201);
  },

  async unsubscribe(req, programmeId) {
    const [claims, err] = await requireAuth(req);
    if (err) return json({ error: "Unauthorized" }, err);

    const existing = programmeInterestModel.findByUserAndProgramme(Number(claims.sub), programmeId);
    if (!existing) return json({ error: "Subscription not found" }, 404);

    programmeInterestModel.remove(existing.id);
    return json({ ok: true });
  },
};
