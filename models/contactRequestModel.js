import { db } from "../db/client.js";
import { now, deserialize } from "../db/utils.js";

export const interestRegistrationModel = {
  findAll() {
    return db.prepare("SELECT * FROM contact_requests ORDER BY created_at DESC").all().map(deserialize);
  },

  findById(id) {
    return deserialize(db.prepare("SELECT * FROM contact_requests WHERE id = ?").get(id));
  },

  findByProgramme(programmeId) {
    return db.prepare("SELECT * FROM contact_requests WHERE programme_id = ? ORDER BY created_at DESC")
      .all(programmeId).map(deserialize);
  },

  create({ firstName, lastName, email, phone, programmeId, message }) {
    const ts = now();
    const { lastInsertRowid } = db.prepare(`
      INSERT INTO contact_requests
        (first_name, last_name, email, phone, programme_id, message, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(firstName, lastName, email, phone ?? null, programmeId, message ?? null, ts, ts);
    return interestRegistrationModel.findById(lastInsertRowid);
  },

  remove(id) {
    db.prepare("DELETE FROM contact_requests WHERE id = ?").run(id);
  },
};
