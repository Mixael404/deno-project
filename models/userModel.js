import { db } from "../db/client.js";
import { now, deserialize, applyUpdate } from "../db/utils.js";

export const adminUserModel = {
  findAll() {
    return db.prepare("SELECT * FROM users ORDER BY email").all().map(deserialize);
  },

  findById(id) {
    return deserialize(db.prepare("SELECT * FROM users WHERE id = ?").get(id));
  },

  findByEmail(email) {
    return deserialize(db.prepare("SELECT * FROM users WHERE email = ?").get(email));
  },

  create({ email, passwordHash, role }) {
    const ts = now();
    const { lastInsertRowid } = db.prepare(`
      INSERT INTO users (email, password_hash, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(email, passwordHash, role, ts, ts);
    return adminUserModel.findById(lastInsertRowid);
  },

  update(id, { email, passwordHash, role }) {
    applyUpdate(db, "users", id, {
      email,
      password_hash: passwordHash,
      role,
    });
    return adminUserModel.findById(id);
  },

  remove(id) {
    db.prepare("DELETE FROM users WHERE id = ?").run(id);
  },
};
