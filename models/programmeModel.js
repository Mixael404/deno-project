import { db } from "../db/client.js";
import { now, deserialize, applyUpdate } from "../db/utils.js";

export const programmeModel = {
  findPublished({ search = "", level = "" } = {}) {
    const conds  = ["p.is_published = 1"];
    const params = [];

    if (level === "UNDERGRADUATE" || level === "POSTGRADUATE") {
      conds.push("p.level = ?");
      params.push(level);
    }
    if (search) {
      const like = `%${search.toLowerCase()}%`;
      conds.push(`(
        LOWER(p.title) LIKE ?
        OR LOWER(p.short_description) LIKE ?
        OR LOWER(p.description) LIKE ?
        OR EXISTS (
          SELECT 1 FROM modules m2
          JOIN programme_modules pm2 ON pm2.module_id = m2.id
          WHERE pm2.programme_id = p.id AND LOWER(m2.title) LIKE ?
        )
      )`);
      params.push(like, like, like, like);
    }

    const sql = `SELECT p.* FROM programmes p WHERE ${conds.join(" AND ")} ORDER BY p.title`;
    const programmes = db.prepare(sql).all(...params).map(deserialize);

    const moduleStmt = db.prepare(`
      SELECT m.id, m.title, m.image_url, m.short_description,
             pm.year AS module_year,
             s.first_name AS leader_first_name, s.last_name AS leader_last_name,
             s.position AS leader_position
      FROM modules m
      JOIN programme_modules pm ON pm.module_id = m.id
      LEFT JOIN staff_members s ON s.id = m.module_leader_id
      WHERE pm.programme_id = ?
      ORDER BY pm.year, pm.sort_order
    `);
    const staffStmt = db.prepare(
      "SELECT id, first_name, last_name, position, image_url FROM staff_members WHERE id = ?"
    );

    for (const p of programmes) {
      p.modules = moduleStmt.all(p.id).map(deserialize);
      p.leader  = p.programmeLeaderId
        ? (deserialize(staffStmt.get(p.programmeLeaderId)) ?? null)
        : null;
    }
    return programmes;
  },

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
    return programmeModel.findById(Number(lastInsertRowid));
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
