import { db } from "../db/client.js";
import { now, deserialize, applyUpdate } from "../db/utils.js";

export const staffMemberModel = {
  findAll() {
    return db.prepare("SELECT * FROM staff_members ORDER BY last_name, first_name").all().map(deserialize);
  },

  findById(id) {
    return deserialize(db.prepare("SELECT * FROM staff_members WHERE id = ?").get(id));
  },

  findByEmail(email) {
    return deserialize(db.prepare("SELECT * FROM staff_members WHERE email = ?").get(email));
  },

  create({ firstName, lastName, email, position, bio, imageUrl }) {
    const ts = now();
    const { lastInsertRowid } = db.prepare(`
      INSERT INTO staff_members (first_name, last_name, email, position, bio, image_url, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(firstName, lastName, email, position, bio ?? null, imageUrl ?? null, ts, ts);
    return staffMemberModel.findById(lastInsertRowid);
  },

  update(id, { firstName, lastName, email, position, bio, imageUrl }) {
    applyUpdate(db, "staff_members", id, {
      first_name: firstName,
      last_name:  lastName,
      email,
      position,
      bio,
      image_url:  imageUrl,
    });
    return staffMemberModel.findById(id);
  },

  remove(id) {
    db.prepare("DELETE FROM staff_members WHERE id = ?").run(id);
  },
};
