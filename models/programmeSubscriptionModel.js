import { db } from "../db/client.js";
import { now, deserialize } from "../db/utils.js";

export const programmeInterestModel = {
  findByUser(userId) {
    return db.prepare("SELECT * FROM programme_subscriptions WHERE user_id = ? ORDER BY created_at DESC")
      .all(userId).map(deserialize);
  },

  findByProgramme(programmeId) {
    return db.prepare("SELECT * FROM programme_subscriptions WHERE programme_id = ? ORDER BY created_at DESC")
      .all(programmeId).map(deserialize);
  },

  findById(id) {
    return deserialize(db.prepare("SELECT * FROM programme_subscriptions WHERE id = ?").get(id));
  },

  create({ userId, programmeId }) {
    const ts = now();
    const { lastInsertRowid } = db.prepare(`
      INSERT INTO programme_subscriptions (user_id, programme_id, status, created_at, updated_at)
      VALUES (?, ?, 'ACTIVE', ?, ?)
    `).run(userId, programmeId, ts, ts);
    return programmeInterestModel.findById(Number(lastInsertRowid));
  },

  setStatus(id, status) {
    db.prepare("UPDATE programme_subscriptions SET status = ?, updated_at = ? WHERE id = ?")
      .run(status, now(), id);
    return programmeInterestModel.findById(id);
  },

  findByProgrammeWithUsers(programmeId, { page = 1, limit = 15 } = {}) {
    const offset = (page - 1) * limit;
    const total  = db.prepare(
      "SELECT COUNT(*) as n FROM programme_subscriptions WHERE programme_id = ?"
    ).get(programmeId).n;
    const subscribers = db.prepare(`
      SELECT u.id AS user_id, u.first_name, u.last_name, u.email, ps.created_at AS subscribed_at
      FROM programme_subscriptions ps
      JOIN users u ON u.id = ps.user_id
      WHERE ps.programme_id = ?
      ORDER BY ps.created_at DESC
      LIMIT ? OFFSET ?
    `).all(programmeId, limit, offset).map(deserialize);
    return { subscribers, total, page, limit, pages: Math.ceil(total / limit) || 1 };
  },

  getAllEmailsByProgramme(programmeId) {
    return db.prepare(`
      SELECT u.email
      FROM programme_subscriptions ps
      JOIN users u ON u.id = ps.user_id
      WHERE ps.programme_id = ?
      ORDER BY u.email
    `).all(programmeId).map((r) => r.email);
  },

  findByUserAndProgramme(userId, programmeId) {
    return deserialize(
      db.prepare("SELECT * FROM programme_subscriptions WHERE user_id = ? AND programme_id = ?")
        .get(userId, programmeId)
    );
  },

  remove(id) {
    db.prepare("DELETE FROM programme_subscriptions WHERE id = ?").run(id);
  },

  removeByUserAndProgramme(userId, programmeId) {
    db.prepare("DELETE FROM programme_subscriptions WHERE user_id = ? AND programme_id = ?")
      .run(userId, programmeId);
  },
};
