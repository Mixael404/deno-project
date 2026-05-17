import { db } from "./client.js";

// Tables are created in FK-dependency order.
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    role          TEXT    NOT NULL CHECK(role IN ('ADMIN', 'STUDENT')),
    created_at    TEXT    NOT NULL,
    updated_at    TEXT    NOT NULL,
    first_name    TEXT,
    last_name     TEXT,
    phone         TEXT
  );

  CREATE TABLE IF NOT EXISTS staff_members (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name  TEXT NOT NULL,
    email      TEXT NOT NULL UNIQUE,
    position   TEXT NOT NULL,
    bio        TEXT,
    image_url  TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS programmes (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    title               TEXT    NOT NULL,
    slug                TEXT    NOT NULL UNIQUE,
    short_description   TEXT    NOT NULL,
    description         TEXT    NOT NULL,
    level               TEXT    NOT NULL CHECK(level IN ('UNDERGRADUATE', 'POSTGRADUATE')),
    image_url           TEXT,
    duration_years      INTEGER NOT NULL,
    is_published        INTEGER NOT NULL DEFAULT 0,
    programme_leader_id INTEGER NOT NULL REFERENCES staff_members(id),
    created_at          TEXT    NOT NULL,
    updated_at          TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS modules (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    title             TEXT NOT NULL,
    code              TEXT,
    slug              TEXT NOT NULL UNIQUE,
    short_description TEXT,
    description       TEXT NOT NULL,
    image_url         TEXT,
    module_leader_id  INTEGER NOT NULL REFERENCES staff_members(id),
    created_at        TEXT NOT NULL,
    updated_at        TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS programme_modules (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    programme_id INTEGER NOT NULL REFERENCES programmes(id),
    module_id    INTEGER NOT NULL REFERENCES modules(id),
    year         INTEGER NOT NULL,
    semester     INTEGER,
    is_core      INTEGER NOT NULL DEFAULT 1,
    sort_order   INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT    NOT NULL,
    updated_at   TEXT    NOT NULL,

    UNIQUE(programme_id, module_id)
  );

  CREATE TABLE IF NOT EXISTS contact_requests (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name     TEXT    NOT NULL,
    last_name      TEXT    NOT NULL,
    email          TEXT    NOT NULL,
    phone          TEXT,
    programme_id   INTEGER NOT NULL REFERENCES programmes(id),
    message        TEXT,
    created_at     TEXT    NOT NULL,
    updated_at     TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS programme_subscriptions (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL REFERENCES users(id),
    programme_id INTEGER NOT NULL REFERENCES programmes(id),
    status       TEXT    NOT NULL CHECK(status IN ('ACTIVE', 'WITHDRAWN')),
    created_at   TEXT    NOT NULL,
    updated_at   TEXT    NOT NULL,

    UNIQUE(user_id, programme_id)
  );
`);
