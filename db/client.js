import { Database } from "jsr:@db/sqlite";

export const db = new Database("app.db");

db.exec("PRAGMA journal_mode=WAL");
db.exec("PRAGMA foreign_keys=ON");
