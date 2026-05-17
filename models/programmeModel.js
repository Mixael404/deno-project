import { db } from "../db/client.js";
import { now, deserialize, applyUpdate } from "../db/utils.js";

export const programmeModel = {
  findAll({ publishedOnly = false } = {}) {
    const sql = publishedOnly
      ? "SELECT * FROM programmes WHERE is_published = 1 ORDER BY title"
      : "SELECT * FROM programmes ORDER BY title";
    return db.prepare(sql).all().map(deserialize);
  },

  findById(id) {
    return deserialize(db.prepare("SELECT * FROM programmes WHERE id = ?").get(id));
  },

  findBySlug(slug) {
    return deserialize(db.prepare("SELECT * FROM programmes WHERE slug = ?").get(slug));
  },

  findByLeader(programmeLeaderId) {
    return db.prepare("SELECT * FROM programmes WHERE programme_leader_id = ? ORDER BY title")
      .all(programmeLeaderId).map(deserialize);
  },

  create({ title, slug, shortDescription, description, level, imageUrl, durationYears, isPublished = false, programmeLeaderId }) {
    const ts = now();
    const { lastInsertRowid } = db.prepare(`
      INSERT INTO programmes
        (title, slug, short_description, description, level, image_url, duration_years, is_published, programme_leader_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(title, slug, shortDescription, description, level, imageUrl ?? null, durationYears, isPublished ? 1 : 0, programmeLeaderId, ts, ts);
    return programmeModel.findById(lastInsertRowid);
  },

  update(id, { title, slug, shortDescription, description, level, imageUrl, durationYears, isPublished, programmeLeaderId }) {
    applyUpdate(db, "programmes", id, {
      title,
      slug,
      short_description:   shortDescription,
      description,
      level,
      image_url:           imageUrl,
      duration_years:      durationYears,
      is_published:        isPublished !== undefined ? (isPublished ? 1 : 0) : undefined,
      programme_leader_id: programmeLeaderId,
    });
    return programmeModel.findById(id);
  },

  remove(id) {
    db.prepare("DELETE FROM programmes WHERE id = ?").run(id);
  },
};
