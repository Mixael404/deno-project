import { db } from "../db/client.js";
import { now, deserialize, applyUpdate } from "../db/utils.js";

export const programmeModuleModel = {
  findByProgramme(programmeId) {
    return db.prepare("SELECT * FROM programme_modules WHERE programme_id = ? ORDER BY year, sort_order")
      .all(programmeId).map(deserialize);
  },

  findByModule(moduleId) {
    return db.prepare("SELECT * FROM programme_modules WHERE module_id = ?")
      .all(moduleId).map(deserialize);
  },

  findById(id) {
    return deserialize(db.prepare("SELECT * FROM programme_modules WHERE id = ?").get(id));
  },

  create({ programmeId, moduleId, year, semester, isCore = true, sortOrder = 0 }) {
    const ts = now();
    const { lastInsertRowid } = db.prepare(`
      INSERT INTO programme_modules (programme_id, module_id, year, semester, is_core, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(programmeId, moduleId, year, semester ?? null, isCore ? 1 : 0, sortOrder, ts, ts);
    return programmeModuleModel.findById(lastInsertRowid);
  },

  update(id, { year, semester, isCore, sortOrder }) {
    applyUpdate(db, "programme_modules", id, {
      year,
      semester,
      is_core:    isCore !== undefined ? (isCore ? 1 : 0) : undefined,
      sort_order: sortOrder,
    });
    return programmeModuleModel.findById(id);
  },

  remove(id) {
    db.prepare("DELETE FROM programme_modules WHERE id = ?").run(id);
  },
};
