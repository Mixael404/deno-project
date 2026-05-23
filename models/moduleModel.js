import { db } from "../db/client.js";
import { now, deserialize, applyUpdate } from "../db/utils.js";

export const moduleModel = {
  findAll() {
    return db.prepare("SELECT * FROM modules ORDER BY title").all().map(deserialize);
  },

  findById(id) {
    return deserialize(db.prepare("SELECT * FROM modules WHERE id = ?").get(id));
  },

  findBySlug(slug) {
    return deserialize(db.prepare("SELECT * FROM modules WHERE slug = ?").get(slug));
  },

  findByCode(code) {
    return deserialize(db.prepare("SELECT * FROM modules WHERE code = ?").get(code));
  },

  findByLeader(moduleLeaderId) {
    return db.prepare("SELECT * FROM modules WHERE module_leader_id = ? ORDER BY title")
      .all(moduleLeaderId).map(deserialize);
  },

  create({ title, code, slug, shortDescription, description, imageUrl, moduleLeaderId }) {
    const ts = now();
    const { lastInsertRowid } = db.prepare(`
      INSERT INTO modules
        (title, code, slug, short_description, description, image_url, module_leader_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(title, code ?? null, slug, shortDescription ?? null, description, imageUrl ?? null, moduleLeaderId, ts, ts);
    return moduleModel.findById(Number(lastInsertRowid));
  },

  update(id, { title, code, slug, shortDescription, description, imageUrl, moduleLeaderId }) {
    applyUpdate(db, "modules", id, {
      title,
      code,
      slug,
      short_description: shortDescription,
      description,
      image_url:         imageUrl,
      module_leader_id:  moduleLeaderId,
    });
    return moduleModel.findById(id);
  },

  remove(id) {
    db.prepare("DELETE FROM modules WHERE id = ?").run(id);
  },
};
