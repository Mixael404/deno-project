import { db } from "../db/client.js";
import { now, deserialize, applyUpdate } from "../db/utils.js";

export const userModel = {
  findAll() {
    return db.prepare("SELECT * FROM users ORDER BY email").all().map(deserialize);
  },

  findById(id) {
    return deserialize(db.prepare("SELECT * FROM users WHERE id = ?").get(id));
  },

  findByEmail(email) {
    return deserialize(db.prepare("SELECT * FROM users WHERE email = ?").get(email));
  },

  create({ email, passwordHash, role, firstName, lastName, phone }) {
    const ts = now();
    db.prepare(`
      INSERT INTO users (email, password_hash, role, first_name, last_name, phone, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(email, passwordHash, role, firstName ?? null, lastName ?? null, phone ?? null, ts, ts);
    return userModel.findById(Number(db.lastInsertRowId));
  },

  update(id, { email, passwordHash, role, firstName, lastName, phone }) {
    applyUpdate(db, "users", id, {
      email,
      password_hash: passwordHash,
      role,
      first_name:    firstName,
      last_name:     lastName,
      phone,
    });
    return userModel.findById(id);
  },

  remove(id) {
    db.prepare("DELETE FROM users WHERE id = ?").run(id);
  },
};
