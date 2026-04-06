import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getUpload, getCollections, getCollectionHashes } from '@/lib/db';
import { intersect, difference, pluralise } from '@/lib/utils';
import type { Metadata } from 'next';

interface Props {
  params: { left: string; right: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const l = getUpload(params.left);
  const r = getUpload(params.right);
  if (!l || !r) return { title: 'Compare' };
  return { title: `Compare: ${l.uploaderName} vs ${r.uploaderName}` };
}

interface CollectionComparison {
  name: string;
  leftId?: string;
  rightId?: string;
  leftCount: number;
  rightCount: number;
  sharedCount: number;
  leftOnlyCount: number;
  rightOnlyCount: number;
}

export default function CompareDetailPage({ params }: Props) {
  const leftUpload = getUpload(params.left);
  const rightUpload = getUpload(params.right);

  if (!leftUpload || !rightUpload) notFound();
  if (leftUpload.id === rightUpload.id) {
    return (
      <div className="max-w-3xl mx-auto">
        <p className="text-slate-500">Cannot compare an upload with itself.</p>
      </div>
    );
  }

  const leftCollections = getCollections(leftUpload.id);
  const rightCollections = getCollections(rightUpload.id);

  const rightByName = new Map(rightCollections.map((c) => [c.name, c]));
  const processedNames = new Set<string>();

  const comparisons: CollectionComparison[] = [];

  for (const lc of leftCollections) {
    const rc = rightByName.get(lc.name);
    processedNames.add(lc.name);

    if (rc) {
      const leftHashes = new Set(getCollectionHashes(lc.id));
      const rightHashes = new Set(getCollectionHashes(rc.id));
      const shared = intersect(leftHashes, rightHashes);
      comparisons.push({
        name: lc.name,
        leftId: lc.id,
        rightId: rc.id,
        leftCount: leftHashes.size,
        rightCount: rightHashes.size,
        sharedCount: shared.size,
        leftOnlyCount: difference(leftHashes, rightHashes).size,
        rightOnlyCount: difference(rightHashes, leftHashes).size,
      });
    } else {
      comparisons.push({
        name: lc.name,
        leftId: lc.id,
        leftCount: lc.mapCount,
        rightCount: 0,
        sharedCount: 0,
        leftOnlyCount: lc.mapCount,
        rightOnlyCount: 0,
      });
    }
  }

  for (const rc of rightCollections) {
    if (!processedNames.has(rc.name)) {
      comparisons.push({
        name: rc.name,
        rightId: rc.id,
        leftCount: 0,
        rightCount: rc.mapCount,
        sharedCount: 0,
        leftOnlyCount: 0,
        rightOnlyCount: rc.mapCount,
      });
    }
  }

  const sharedCollections = comparisons.filter((c) => c.leftId && c.rightId);
  const leftOnly = comparisons.filter((c) => c.leftId && !c.rightId);
  const rightOnly = comparisons.filter((c) => !c.leftId && c.rightId);
  const totalSharedMaps = sharedCollections.reduce((s, c) => s + c.sharedCount, 0);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back */}
      <Link
        href="/compare"
        className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-4 inline-flex items-center gap-1"
      >
        ← Change uploads
      </Link>

      {/* Header */}
      <div className="grid grid-cols-2 gap-3 mb-6 mt-2">
        <div className="card p-4">
          <div className="text-xs text-slate-400 mb-1 font-medium uppercase tracking-wide">Left</div>
          <div className="font-bold text-slate-900 dark:text-slate-100">{leftUpload.uploaderName}</div>
          <div className="text-xs text-slate-500 mt-1">
            {pluralise(leftUpload.collectionCount, 'collection')} · {leftUpload.totalMaps.toLocaleString()} maps
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-400 mb-1 font-medium uppercase tracking-wide">Right</div>
          <div className="font-bold text-slate-900 dark:text-slate-100">{rightUpload.uploaderName}</div>
          <div className="text-xs text-slate-500 mt-1">
            {pluralise(rightUpload.collectionCount, 'collection')} · {rightUpload.totalMaps.toLocaleString()} maps
          </div>
        </div>
      </div>

      {/* Summary bar */}
      <div className="card p-4 mb-6 flex flex-wrap gap-4 items-center text-sm">
        <span className="text-slate-600 dark:text-slate-400">
          <strong className="text-brand-600 dark:text-brand-400">{sharedCollections.length}</strong> shared collections
        </span>
        <span className="text-slate-300 dark:text-slate-600">|</span>
        <span className="text-slate-600 dark:text-slate-400">
          <strong className="text-slate-900 dark:text-slate-100">{leftOnly.length}</strong> only in {leftUpload.uploaderName}
        </span>
        <span className="text-slate-300 dark:text-slate-600">|</span>
        <span className="text-slate-600 dark:text-slate-400">
          <strong className="text-slate-900 dark:text-slate-100">{rightOnly.length}</strong> only in {rightUpload.uploaderName}
        </span>
        <span className="text-slate-300 dark:text-slate-600">|</span>
        <span className="text-slate-600 dark:text-slate-400">
          <strong className="text-green-600 dark:text-green-400">{totalSharedMaps.toLocaleString()}</strong> maps in common
        </span>
      </div>

      {/* Shared collections */}
      {sharedCollections.length > 0 && (
        <section className="mb-6">
          <h2 className="font-semibold text-slate-700 dark:text-slate-300 text-sm mb-2">
            Shared collections ({sharedCollections.length})
          </h2>
          <div className="card divide-y divide-slate-100 dark:divide-slate-700">
            {sharedCollections.map((c) => {
              const overlapPct =
                c.leftCount > 0 || c.rightCount > 0
                  ? Math.round((c.sharedCount / Math.max(c.leftCount, c.rightCount)) * 100)
                  : 0;
              return (
                <div key={c.name} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate max-w-[50%]">
                      {c.name || <em className="text-slate-400 font-normal">unnamed</em>}
                    </span>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="badge-green">{c.sharedCount.toLocaleString()} shared</span>
                      <span className="text-xs text-slate-400">{overlapPct}% overlap</span>
                    </div>
                  </div>
                  <div className="flex gap-4 mt-1.5 text-xs text-slate-500">
                    <span>Left: <strong className="text-slate-700 dark:text-slate-300">{c.leftCount.toLocaleString()}</strong></span>
                    <span>Right: <strong className="text-slate-700 dark:text-slate-300">{c.rightCount.toLocaleString()}</strong></span>
                    {c.leftOnlyCount > 0 && (
                      <span className="text-blue-500">+{c.leftOnlyCount.toLocaleString()} only left</span>
                    )}
                    {c.rightOnlyCount > 0 && (
                      <span className="text-purple-500 dark:text-purple-400">+{c.rightOnlyCount.toLocaleString()} only right</span>
                    )}
                  </div>
                  <div className="mt-2 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-400 rounded-full"
                      style={{ width: `${overlapPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Left-only */}
      {leftOnly.length > 0 && (
        <section className="mb-6">
          <h2 className="font-semibold text-slate-700 dark:text-slate-300 text-sm mb-2">
            Only in {leftUpload.uploaderName} ({leftOnly.length})
          </h2>
          <div className="card divide-y divide-slate-100 dark:divide-slate-700">
            {leftOnly.map((c) => (
              <div key={c.name} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-sm text-slate-700 dark:text-slate-300 truncate max-w-[60%]">
                  {c.name || <em className="text-slate-400">unnamed</em>}
                </span>
                <span className="text-xs text-slate-400">{c.leftCount.toLocaleString()} maps</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Right-only */}
      {rightOnly.length > 0 && (
        <section className="mb-6">
          <h2 className="font-semibold text-slate-700 dark:text-slate-300 text-sm mb-2">
            Only in {rightUpload.uploaderName} ({rightOnly.length})
          </h2>
          <div className="card divide-y divide-slate-100 dark:divide-slate-700">
            {rightOnly.map((c) => (
              <div key={c.name} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-sm text-slate-700 dark:text-slate-300 truncate max-w-[60%]">
                  {c.name || <em className="text-slate-400">unnamed</em>}
                </span>
                <span className="text-xs text-slate-400">{c.rightCount.toLocaleString()} maps</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {comparisons.length === 0 && (
        <div className="card p-8 text-center text-slate-400 text-sm">
          Both uploads have no collections.
        </div>
      )}
    </div>
  );
}
