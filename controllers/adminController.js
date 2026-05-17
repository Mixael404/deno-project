import { userModel }        from "../models/userModel.js";
import { verifyAccessToken } from "../utils/jwt.js";
import { getCookie }         from "../utils/cookies.js";

function json(data, status = 200) {
  return Response.json(data, { status });
}

async function requireAdmin(req) {
  const token = getCookie(req, "access_token");
  if (!token) return null;
  try {
    const claims = await verifyAccessToken(token);
    return claims.role === "ADMIN" ? claims : null;
  } catch {
    return null;
  }
}

export const adminController = {
  async getUsers(req) {
    const claims = await requireAdmin(req);
    if (!claims) return json({ error: "Forbidden" }, 403);

    const users = userModel.findAll().map(({ passwordHash: _, ...u }) => u);
    return json({ users });
  },
};
