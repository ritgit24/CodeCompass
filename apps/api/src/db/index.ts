import fs from "node:fs";
import { createRequire } from "node:module";
import { paths } from "../utils/paths";
import { logger } from "../utils/logger";
import { SCHEMA_SQL } from "./schema";

const require = createRequire(import.meta.url);

/** Minimal synchronous SQLite surface shared by both drivers. */
export interface SqliteStatement {
  run(...params: unknown[]): { changes: number; lastInsertRowid?: number | bigint };
  get(...params: unknown[]): unknown;
  all(...params: unknown[]): unknown[];
}

export interface SqliteDb {
  exec(sql: string): void;
  prepare(sql: string): SqliteStatement;
  driver: "better-sqlite3" | "node:sqlite";
  close(): void;
}

function openBetterSqlite(file: string): SqliteDb | null {
  try {
    const Database = require("better-sqlite3");
    const db = new Database(file);
    db.pragma("journal_mode = WAL");
    return {
      driver: "better-sqlite3",
      exec: (sql) => db.exec(sql),
      prepare: (sql) => db.prepare(sql) as SqliteStatement,
      close: () => db.close(),
    };
  } catch (err) {
    logger.warn("better-sqlite3 unavailable, will try node:sqlite", (err as Error).message);
    return null;
  }
}

function openNodeSqlite(file: string): SqliteDb {
  const { DatabaseSync } = require("node:sqlite");
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL;");
  return {
    driver: "node:sqlite",
    exec: (sql) => db.exec(sql),
    prepare: (sql) => db.prepare(sql) as SqliteStatement,
    close: () => db.close(),
  };
}

let instance: SqliteDb | null = null;

export function getDb(): SqliteDb {
  if (instance) return instance;
  fs.mkdirSync(paths.dataDir, { recursive: true });
  const file = paths.dbFile();
  const db = openBetterSqlite(file) ?? openNodeSqlite(file);
  db.exec(SCHEMA_SQL);
  logger.info(`SQLite ready via ${db.driver} at ${file}`);
  instance = db;
  return instance;
}

export function closeDb() {
  instance?.close();
  instance = null;
}

/** Typed helpers over the tiny driver surface. */
export function all<T = Record<string, unknown>>(sql: string, ...params: unknown[]): T[] {
  return getDb()
    .prepare(sql)
    .all(...params) as T[];
}

export function get<T = Record<string, unknown>>(sql: string, ...params: unknown[]): T | undefined {
  return getDb()
    .prepare(sql)
    .get(...params) as T | undefined;
}

export function run(sql: string, ...params: unknown[]) {
  return getDb()
    .prepare(sql)
    .run(...params);
}

export function parseJson<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
