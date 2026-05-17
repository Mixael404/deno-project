import { db } from "../db/client.js";
import { now, deserialize } from "../db/utils.js";

export const sessionModel = {
  findById(id) {
    return deserialize(db.prepare("SELECT * FROM sessions WHERE id = ?").get(id));
  },

  findByRefreshToken(token) {
    return deserialize(
      db.prepare("SELECT * FROM sessions WHERE refresh_token = ?").get(token),
    );
  },

  create({ userId, refreshToken, expiresAt }) {
    const ts = now();
    db.prepare(`
      INSERT INTO sessions (user_id, refresh_token, expires_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, refreshToken, expiresAt, ts, ts);
    return sessionModel.findById(Number(db.lastInsertRowId));
  },

  // Rotates the refresh token while keeping the same session record.
  rotate(id, newRefreshToken, newExpiresAt) {
    db.prepare(`
      UPDATE sessions SET refresh_token = ?, expires_at = ?, updated_at = ? WHERE id = ?
    `).run(newRefreshToken, newExpiresAt, now(), id);
    return sessionModel.findById(id);
  },

  remove(id) {
    db.prepare("DELETE FROM sessions WHERE id = ?").run(id);
  },

  removeByRefreshToken(token) {
    db.prepare("DELETE FROM sessions WHERE refresh_token = ?").run(token);
  },

  removeAllForUser(userId) {
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
  },
};
