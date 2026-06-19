import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "library.db");

// Ensure the db directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  _db = new Database(DB_PATH);

  // Enable WAL mode for better concurrent read performance
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");

  // ── Schema ───────────────────────────────────────────────────────────────
  _db.exec(`
    CREATE TABLE IF NOT EXISTS pdf_files (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      originalName TEXT NOT NULL,
      filePath    TEXT NOT NULL,
      pageCount   INTEGER,
      chunkCount  INTEGER,
      fileSize    INTEGER,
      createdAt   TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_history (
      id        TEXT PRIMARY KEY,
      pdfId     TEXT NOT NULL REFERENCES pdf_files(id) ON DELETE CASCADE,
      role      TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      content   TEXT NOT NULL,
      citations TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_chat_pdfId ON chat_history(pdfId);
    CREATE INDEX IF NOT EXISTS idx_chat_createdAt ON chat_history(createdAt);
  `);

  console.log(`[sqlite] Connected to ${DB_PATH}`);
  return _db;
}

// ── Query helpers ─────────────────────────────────────────────────────────────

export function dbInsertPdf(
  db: Database.Database,
  pdf: {
    id: string;
    name: string;
    originalName: string;
    filePath: string;
    pageCount: number | null;
    chunkCount: number | null;
    fileSize: number | null;
    createdAt: string;
  }
) {
  db.prepare(`
    INSERT INTO pdf_files (id, name, originalName, filePath, pageCount, chunkCount, fileSize, createdAt)
    VALUES (@id, @name, @originalName, @filePath, @pageCount, @chunkCount, @fileSize, @createdAt)
  `).run(pdf);
}

export function dbGetAllPdfs(db: Database.Database) {
  return db.prepare("SELECT * FROM pdf_files ORDER BY createdAt DESC").all();
}

export function dbGetPdfById(db: Database.Database, id: string) {
  return db.prepare("SELECT * FROM pdf_files WHERE id = ?").get(id);
}

export function dbDeletePdf(db: Database.Database, id: string) {
  db.prepare("DELETE FROM pdf_files WHERE id = ?").run(id);
}

export function dbInsertChatMessage(
  db: Database.Database,
  msg: {
    id: string;
    pdfId: string;
    role: "user" | "assistant";
    content: string;
    citations: string | null;
    createdAt: string;
  }
) {
  db.prepare(`
    INSERT INTO chat_history (id, pdfId, role, content, citations, createdAt)
    VALUES (@id, @pdfId, @role, @content, @citations, @createdAt)
  `).run(msg);
}

export function dbGetHistory(db: Database.Database, pdfId: string, limit = 50) {
  return db
    .prepare(
      "SELECT * FROM chat_history WHERE pdfId = ? ORDER BY createdAt ASC LIMIT ?"
    )
    .all(pdfId, limit);
}

export function dbClearHistory(db: Database.Database, pdfId: string) {
  db.prepare("DELETE FROM chat_history WHERE pdfId = ?").run(pdfId);
}
