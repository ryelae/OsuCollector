/**
 * SQLite database layer using better-sqlite3.
 * All queries are synchronous (better-sqlite3 is synchronous by design).
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const DATA_DIR = path.join(process.cwd(), 'data');
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const DB_PATH = path.join(DATA_DIR, 'db.sqlite');

function ensureDirs(): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// ---------------------------------------------------------------------------
// Singleton (safe for Next.js hot-reload in dev)
// ---------------------------------------------------------------------------

const g = global as unknown as { _osuHubDb?: Database.Database };

function getDb(): Database.Database {
  if (g._osuHubDb) return g._osuHubDb;

  ensureDirs();

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS uploads (
      id               TEXT    PRIMARY KEY,
      uploader_name    TEXT    NOT NULL DEFAULT 'Anonymous',
      original_filename TEXT   NOT NULL,
      created_at       INTEGER NOT NULL,
      file_path        TEXT,
      parser_version   INTEGER NOT NULL DEFAULT 0,
      app_version      TEXT    NOT NULL DEFAULT '1.0.0',
      collection_count INTEGER NOT NULL DEFAULT 0,
      total_maps       INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS collections (
      id         TEXT    PRIMARY KEY,
      upload_id  TEXT    NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
      name       TEXT    NOT NULL,
      map_count  INTEGER NOT NULL DEFAULT 0,
      position   INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_coll_upload ON collections(upload_id);

    CREATE TABLE IF NOT EXISTS collection_entries (
      id              TEXT    PRIMARY KEY,
      collection_id   TEXT    NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
      beatmap_hash    TEXT    NOT NULL,
      position        INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_entry_coll   ON collection_entries(collection_id);
    CREATE INDEX IF NOT EXISTS idx_entry_hash   ON collection_entries(beatmap_hash);
  `);

  g._osuHubDb = db;
  return db;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Upload {
  id: string;
  uploaderName: string;
  originalFilename: string;
  createdAt: number;
  filePath: string | null;
  parserVersion: number;
  appVersion: string;
  collectionCount: number;
  totalMaps: number;
}

export interface Collection {
  id: string;
  uploadId: string;
  name: string;
  mapCount: number;
  position: number;
}

// ---------------------------------------------------------------------------
// Row mappers
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toUpload(row: any): Upload {
  return {
    id: row.id,
    uploaderName: row.uploader_name,
    originalFilename: row.original_filename,
    createdAt: row.created_at,
    filePath: row.file_path,
    parserVersion: row.parser_version,
    appVersion: row.app_version,
    collectionCount: row.collection_count,
    totalMaps: row.total_maps,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toCollection(row: any): Collection {
  return {
    id: row.id,
    uploadId: row.upload_id,
    name: row.name,
    mapCount: row.map_count,
    position: row.position,
  };
}

// ---------------------------------------------------------------------------
// Uploads
// ---------------------------------------------------------------------------

export function listUploads(): Upload[] {
  return (getDb().prepare('SELECT * FROM uploads ORDER BY created_at DESC').all() as object[]).map(
    toUpload
  );
}

export function getUpload(id: string): Upload | null {
  const row = getDb().prepare('SELECT * FROM uploads WHERE id = ?').get(id);
  return row ? toUpload(row) : null;
}

export interface CreateUploadInput {
  uploaderName: string;
  originalFilename: string;
  filePath: string;
  parserVersion: number;
  collectionCount: number;
  totalMaps: number;
}

export function createUpload(input: CreateUploadInput): string {
  const db = getDb();
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO uploads
       (id, uploader_name, original_filename, created_at, file_path,
        parser_version, app_version, collection_count, total_maps)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.uploaderName,
    input.originalFilename,
    Date.now(),
    input.filePath,
    input.parserVersion,
    '1.0.0',
    input.collectionCount,
    input.totalMaps
  );
  return id;
}

export function deleteUpload(id: string): boolean {
  const db = getDb();
  const upload = getUpload(id);
  if (!upload) return false;

  // Remove file from disk
  if (upload.filePath) {
    try {
      fs.unlinkSync(upload.filePath);
    } catch {
      // File already gone, not a problem
    }
  }

  db.prepare('DELETE FROM uploads WHERE id = ?').run(id);
  return true;
}

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------

export function getCollections(uploadId: string): Collection[] {
  return (
    getDb()
      .prepare('SELECT * FROM collections WHERE upload_id = ? ORDER BY position ASC')
      .all(uploadId) as object[]
  ).map(toCollection);
}

export function getCollection(id: string): Collection | null {
  const row = getDb().prepare('SELECT * FROM collections WHERE id = ?').get(id);
  return row ? toCollection(row) : null;
}

export function createCollections(
  uploadId: string,
  collections: Array<{ name: string; hashes: string[] }>
): void {
  const db = getDb();

  const insertColl = db.prepare(
    `INSERT INTO collections (id, upload_id, name, map_count, position) VALUES (?, ?, ?, ?, ?)`
  );
  const insertEntry = db.prepare(
    `INSERT INTO collection_entries (id, collection_id, beatmap_hash, position) VALUES (?, ?, ?, ?)`
  );

  db.transaction(() => {
    for (let i = 0; i < collections.length; i++) {
      const { name, hashes } = collections[i];
      const collId = crypto.randomUUID();
      insertColl.run(collId, uploadId, name, hashes.length, i);

      for (let j = 0; j < hashes.length; j++) {
        insertEntry.run(crypto.randomUUID(), collId, hashes[j], j);
      }
    }
  })();
}

// ---------------------------------------------------------------------------
// Hashes / entries
// ---------------------------------------------------------------------------

export function getCollectionHashes(collectionId: string): string[] {
  const rows = getDb()
    .prepare(
      'SELECT beatmap_hash FROM collection_entries WHERE collection_id = ? ORDER BY position ASC'
    )
    .all(collectionId) as { beatmap_hash: string }[];
  return rows.map((r) => r.beatmap_hash);
}

/** Return all hashes for multiple collections in one DB round-trip per ID */
export function getHashesForCollections(
  collectionIds: string[]
): Map<string, string[]> {
  const result = new Map<string, string[]>();
  for (const id of collectionIds) {
    result.set(id, getCollectionHashes(id));
  }
  return result;
}

/** Search collections by name fragment across all uploads */
export function searchCollections(query: string): (Collection & { uploaderName: string })[] {
  const like = `%${query}%`;
  const rows = getDb()
    .prepare(
      `SELECT c.*, u.uploader_name
       FROM collections c
       JOIN uploads u ON u.id = c.upload_id
       WHERE c.name LIKE ?
       ORDER BY c.name ASC
       LIMIT 200`
    )
    .all(like) as object[];
  return rows.map((r: object) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = r as any;
    return { ...toCollection(row), uploaderName: row.uploader_name as string };
  });
}
