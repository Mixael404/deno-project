export function now() {
  return new Date().toISOString();
}

// Converts snake_case row from SQLite to camelCase JS object.
// Columns starting with is_ are normalized to boolean.
export function deserialize(row) {
  if (!row) return null;
  return Object.fromEntries(
    Object.entries(row).map(([k, v]) => {
      const camel = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      const value = k.startsWith("is_") ? v === 1 : v;
      return [camel, value];
    }),
  );
}

// Builds a partial UPDATE from a camelCase→snake_case field map.
// Skips entries where value is undefined.
export function applyUpdate(db, table, id, snakeMap) {
  const entries = Object.entries(snakeMap).filter(([, v]) => v !== undefined);
  if (!entries.length) return;
  const set = entries.map(([k]) => `${k} = ?`).join(", ");
  const values = entries.map(([, v]) => v);
  db.prepare(`UPDATE ${table} SET ${set}, updated_at = ? WHERE id = ?`)
    .run(...values, now(), id);
}
