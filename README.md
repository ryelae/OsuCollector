# osu! Collection Hub

A small private web app for 2–3 friends to upload, browse, compare, merge, and export
**osu! stable** `collection.db` files.

---

## What it does

| Feature     | Details                                                                               |
| ----------- | ------------------------------------------------------------------------------------- |
| **Upload**  | Drag-and-drop `collection.db`, name yourself, get a parsed summary                    |
| **Browse**  | View all uploads, see every collection and its map count                              |
| **Compare** | Pick any two uploads, see shared vs unique collections and per-collection map overlap |
| **Merge**   | Select any collections from any uploads, rename output collections, deduplicate maps  |
| **Export**  | Download a valid `collection.db` ready to drop into osu! stable                       |
| **Share**   | Each upload has a permanent shareable link                                            |
| **Auth**    | Optional shared password (env var) — off by default for local use                     |

---

## Supported osu! client

**osu! stable only.** The app reads and writes the legacy `collection.db` binary format.
osu!lazer uses a different format and is not supported.

---

## Quick start (local)

### Prerequisites

- Node.js 18+
- npm 9+

### 1. Clone and install

```bash
git clone <your-repo-url>
cd osu-collection-hub
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
# Edit .env.local — set APP_PASSWORD or leave blank for open access
```

### 3. Run

```bash
npm run dev
# Open http://localhost:3000
```

Data is stored in `./data/` (SQLite DB + uploaded files). This directory is gitignored.

---

## Configuration

| Variable           | Default            | Description                                                                            |
| ------------------ | ------------------ | -------------------------------------------------------------------------------------- |
| `APP_PASSWORD`     | _(not set)_        | If set, the app requires this password to access. Leave unset for open/local-only use. |
| `MAX_UPLOAD_BYTES` | `52428800` (50 MB) | Maximum `collection.db` upload size in bytes.                                          |
| `PORT`             | `3000`             | Server port (for `npm start` / Docker).                                                |

---

## Auth / private mode

The simplest acceptable auth is a single shared password set via `APP_PASSWORD`.

- **No `APP_PASSWORD` set** → the app is fully open. Fine for local use on a private machine.
- **`APP_PASSWORD` set** → the app shows a login page. Enter the password to get a 30-day session cookie. Share the password with your friends.

There is no per-user auth; anyone with the password can see and delete all uploads. This is intentional for a tiny private group.

---

## Deduplication behaviour

When merging collections:

- **Merge same-named** _(default)_: if two selected collections share the same output name, their maps are combined and deduplicated by beatmap MD5 hash. This is usually the friendliest result — e.g., if you and a friend both have "Favorites", the exported collection contains the union without duplicates.
- **Keep separate**: each collection is kept individually; maps within each collection are still deduplicated, but same-named collections are preserved as-is.

You can rename any collection in the merge UI before exporting.

---

## How to find collection.db

On **Windows**, open File Explorer and paste this in the address bar:

```
%APPDATA%\osu!\collection.db
```

Typical path: `C:\Users\<you>\AppData\Roaming\osu!\collection.db`

Make sure osu! is **closed** before copying the file to avoid partial reads.

---

## Deployment

### Option A — Node.js server (simplest)

```bash
npm run build
APP_PASSWORD=secret npm start
# Runs on port 3000
```

Use a reverse proxy (nginx, Caddy) to add HTTPS.

### Option B — Docker

```bash
# Build
docker build -t osu-collection-hub .

# Run (persist data with a volume)
docker run \
  -p 3000:3000 \
  -e APP_PASSWORD=your_secret \
  -v $(pwd)/data:/app/data \
  osu-collection-hub
```

**Important for Docker:** the `next.config.js` must enable `output: 'standalone'` for the standalone build to work. Add this if needed:

```js
// next.config.js
const nextConfig = {
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
};
```

### Option C — Fly.io / Railway / Render

1. Push code to a git repo.
2. Set `APP_PASSWORD` as a secret environment variable.
3. Mount a persistent volume at `/app/data`.
4. Deploy. These platforms run `npm start` automatically.

---

## Running tests

```bash
npm test
```

Tests cover the binary parser and writer (round-trip, edge cases, error handling).

---

## Project structure

```
src/
  lib/
    collection-parser.ts   # Binary collection.db parser
    collection-writer.ts   # Binary collection.db writer
    db.ts                  # SQLite layer (better-sqlite3)
    auth.ts                # Simple shared-password auth helpers
    utils.ts               # Shared utilities
  middleware.ts            # Auth guard (edge runtime)
  app/
    (app)/                 # Route group — all guarded pages
      layout.tsx           # App shell with nav
      page.tsx             # Home / dashboard
      uploads/             # Upload list + upload form
      compare/             # Compare picker + compare detail
      merge/               # Merge builder + export
    login/                 # Standalone login page
    api/
      uploads/             # POST (upload), GET list, GET/DELETE by id
      export/              # POST → binary collection.db download
      auth/login|logout    # Session management
  components/
    nav.tsx                # Sidebar navigation
    upload-form.tsx        # Drag-drop upload form
    merge-builder.tsx      # Interactive merge/export UI
tests/
  parser.test.ts           # Parser + writer tests
data/                      # Runtime data (gitignored)
  db.sqlite
  uploads/
```

---

## Known limitations

- **Private / small-scale only.** No rate limiting, no per-user isolation, no audit log.
- **osu! stable format only.** osu!lazer's `client.realm` format is not supported.
- **No beatmap metadata.** Collections display MD5 hashes only; song titles/artists are not resolved (would require `osu!.db` or the osu! API). The schema is designed to support metadata later.
- **Single shared password.** There is no per-user account system.
- **Local file storage.** Uploaded files live on disk next to the app. Back up `./data/` regularly.
- **Collection entries with empty hashes** are stored as empty strings; osu! ignores them on import.

---

## Data model

```
Upload
  id, uploaderName, originalFilename, createdAt, filePath,
  parserVersion, appVersion, collectionCount, totalMaps

Collection  (belongs to Upload)
  id, uploadId, name, mapCount, position

CollectionEntry  (belongs to Collection)
  id, collectionId, beatmapHash, position
```
