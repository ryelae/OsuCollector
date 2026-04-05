import path from 'path';
import fs from 'fs/promises';
import { parseCollectionDb } from '@/lib/collection-parser';
import { createUpload, createCollections, listUploads, UPLOADS_DIR } from '@/lib/db';
import { checkRequestAuth } from '@/lib/auth';

export async function GET(request: Request) {
  if (!checkRequestAuth(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return Response.json(listUploads());
}
import { MAX_UPLOAD_BYTES } from '@/lib/utils';

export async function POST(request: Request) {
  if (!checkRequestAuth(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  const uploaderName = ((formData.get('uploaderName') as string) || '').trim() || 'Anonymous';

  if (!file) {
    return Response.json({ error: 'No file provided' }, { status: 400 });
  }

  // Validate filename
  if (file.name !== 'collection.db') {
    return Response.json(
      { error: `Expected filename "collection.db", got "${file.name}"` },
      { status: 400 }
    );
  }

  // Validate size
  if (file.size > MAX_UPLOAD_BYTES) {
    const maxMB = Math.round(MAX_UPLOAD_BYTES / 1024 / 1024);
    return Response.json(
      { error: `File too large (max ${maxMB} MB, got ${(file.size / 1024 / 1024).toFixed(1)} MB)` },
      { status: 413 }
    );
  }

  if (file.size < 8) {
    return Response.json({ error: 'File is too small to be a valid collection.db' }, { status: 400 });
  }

  // Read file
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Parse
  let parsed: Awaited<ReturnType<typeof parseCollectionDb>>;
  try {
    parsed = parseCollectionDb(buffer);
  } catch (e) {
    return Response.json(
      { error: `Failed to parse collection.db: ${(e as Error).message}` },
      { status: 422 }
    );
  }

  // Persist file
  const id = crypto.randomUUID();
  const filePath = path.join(UPLOADS_DIR, `${id}.db`);
  try {
    await fs.writeFile(filePath, buffer);
  } catch (e) {
    return Response.json({ error: 'Failed to save file' }, { status: 500 });
  }

  // Persist to database
  const totalMaps = parsed.collections.reduce((sum, c) => sum + c.beatmapHashes.length, 0);

  try {
    const uploadId = createUpload({
      uploaderName,
      originalFilename: file.name,
      filePath,
      parserVersion: parsed.version,
      collectionCount: parsed.collections.length,
      totalMaps,
    });

    createCollections(
      uploadId,
      parsed.collections.map((c) => ({ name: c.name, hashes: c.beatmapHashes }))
    );

    return Response.json({
      id: uploadId,
      uploaderName,
      collectionCount: parsed.collections.length,
      totalMaps,
      version: parsed.version,
    });
  } catch (e) {
    // Cleanup file if DB insert failed
    try { await fs.unlink(filePath); } catch { /* ignore */ }
    console.error('DB insert failed:', e);
    return Response.json({ error: 'Failed to save upload data' }, { status: 500 });
  }
}
