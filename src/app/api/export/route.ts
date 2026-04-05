import { getCollectionHashes } from '@/lib/db';
import { writeCollectionDb } from '@/lib/collection-writer';
import { checkRequestAuth } from '@/lib/auth';
import { dedupe } from '@/lib/utils';

interface ExportCollection {
  collectionId: string;
  outputName: string;
}

interface ExportRequest {
  collections: ExportCollection[];
  /** 'merge-same-name' (default) — collections sharing an output name are combined+deduped */
  deduplication?: 'merge-same-name' | 'keep-separate';
}

export async function POST(request: Request) {
  if (!checkRequestAuth(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: ExportRequest;
  try {
    body = (await request.json()) as ExportRequest;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { collections, deduplication = 'merge-same-name' } = body;

  if (!Array.isArray(collections) || collections.length === 0) {
    return Response.json({ error: 'No collections selected' }, { status: 400 });
  }

  if (collections.length > 500) {
    return Response.json({ error: 'Too many collections (max 500)' }, { status: 400 });
  }

  try {
    let collectionsToWrite: Array<{ name: string; beatmapHashes: string[] }>;

    if (deduplication === 'merge-same-name') {
      // Group by output name, merge hashes, deduplicate within each group
      const groups = new Map<string, Set<string>>();
      const order: string[] = []; // preserve insertion order

      for (const { collectionId, outputName } of collections) {
        const hashes = getCollectionHashes(collectionId);
        if (!groups.has(outputName)) {
          groups.set(outputName, new Set());
          order.push(outputName);
        }
        const set = groups.get(outputName)!;
        for (const h of hashes) set.add(h);
      }

      collectionsToWrite = order.map((name) => ({
        name,
        beatmapHashes: Array.from(groups.get(name)!),
      }));
    } else {
      // keep-separate: just deduplicate within each collection individually
      collectionsToWrite = collections.map(({ collectionId, outputName }) => ({
        name: outputName,
        beatmapHashes: dedupe(getCollectionHashes(collectionId)),
      }));
    }

    const buffer = writeCollectionDb({ collections: collectionsToWrite });

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment; filename="collection.db"',
        'Content-Length': String(buffer.length),
        'X-Collection-Count': String(collectionsToWrite.length),
        'X-Total-Maps': String(
          collectionsToWrite.reduce((s, c) => s + c.beatmapHashes.length, 0)
        ),
      },
    });
  } catch (e) {
    console.error('Export failed:', e);
    return Response.json({ error: 'Export failed: ' + (e as Error).message }, { status: 500 });
  }
}
