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
    return programmeInterestModel.findById(lastInsertRowid);
  },

  setStatus(id, status) {
    db.prepare("UPDATE programme_subscriptions SET status = ?, updated_at = ? WHERE id = ?")
      .run(status, now(), id);
    return programmeInterestModel.findById(id);
  },

  remove(id) {
    db.prepare("DELETE FROM programme_subscriptions WHERE id = ?").run(id);
  },
};
