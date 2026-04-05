'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn, pluralise } from '@/lib/utils';
import type { Upload, Collection } from '@/lib/db';

interface SelectedCollection {
  collectionId: string;
  uploadId: string;
  uploadName: string;
  originalName: string;
  outputName: string;
  mapCount: number;
}

interface Props {
  initialUploads: Upload[];
  initialIncludeId?: string;
}

export function MergeBuilder({ initialUploads, initialIncludeId }: Props) {
  const [uploads] = useState<Upload[]>(initialUploads);

  // Which uploads are expanded (showing their collections)
  const [expandedUploadIds, setExpandedUploadIds] = useState<Set<string>>(
    () => new Set(initialIncludeId ? [initialIncludeId] : [])
  );

  // Collections fetched per upload
  const [uploadCollections, setUploadCollections] = useState<Map<string, Collection[]>>(
    new Map()
  );
  const [loadingUploadId, setLoadingUploadId] = useState<string | null>(null);

  // The merge selection
  const [selected, setSelected] = useState<SelectedCollection[]>([]);

  // Dedup strategy
  const [dedup, setDedup] = useState<'merge-same-name' | 'keep-separate'>('merge-same-name');

  // Export state
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [exportSuccess, setExportSuccess] = useState(false);

  // Fetch collections for an upload
  const loadCollections = useCallback(
    async (uploadId: string) => {
      if (uploadCollections.has(uploadId)) return;
      setLoadingUploadId(uploadId);
      try {
        const res = await fetch(`/api/uploads/${uploadId}`);
        if (res.ok) {
          const data = await res.json();
          setUploadCollections((prev) => new Map(prev).set(uploadId, data.collections));
        }
      } finally {
        setLoadingUploadId(null);
      }
    },
    [uploadCollections]
  );

  // Auto-load if initialIncludeId is set
  useEffect(() => {
    if (initialIncludeId) {
      loadCollections(initialIncludeId);
    }
  }, [initialIncludeId, loadCollections]);

  const toggleUpload = async (uploadId: string) => {
    const next = new Set(expandedUploadIds);
    if (next.has(uploadId)) {
      next.delete(uploadId);
    } else {
      next.add(uploadId);
      await loadCollections(uploadId);
    }
    setExpandedUploadIds(next);
  };

  const isCollectionSelected = (collectionId: string) =>
    selected.some((s) => s.collectionId === collectionId);

  const toggleCollection = (collection: Collection, upload: Upload) => {
    if (isCollectionSelected(collection.id)) {
      setSelected((prev) => prev.filter((s) => s.collectionId !== collection.id));
    } else {
      setSelected((prev) => [
        ...prev,
        {
          collectionId: collection.id,
          uploadId: upload.id,
          uploadName: upload.uploaderName,
          originalName: collection.name,
          outputName: collection.name,
          mapCount: collection.mapCount,
        },
      ]);
    }
  };

  const updateOutputName = (collectionId: string, name: string) => {
    setSelected((prev) =>
      prev.map((s) => (s.collectionId === collectionId ? { ...s, outputName: name } : s))
    );
  };

  const removeSelected = (collectionId: string) => {
    setSelected((prev) => prev.filter((s) => s.collectionId !== collectionId));
  };

  const handleExport = async () => {
    if (selected.length === 0) return;
    setExporting(true);
    setExportError('');
    setExportSuccess(false);

    try {
      const body = {
        deduplication: dedup,
        collections: selected.map((s) => ({
          collectionId: s.collectionId,
          outputName: s.outputName || s.originalName,
        })),
      };

      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setExportError(data.error ?? 'Export failed');
        return;
      }

      // Trigger download
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'collection.db';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch {
      setExportError('Network error. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // Compute preview stats
  const uniqueOutputNames = new Set(selected.map((s) => s.outputName || s.originalName));
  const totalSelectedMaps = selected.reduce((s, c) => s + c.mapCount, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Left: Source picker */}
      <div className="lg:col-span-3">
        <h2 className="font-semibold text-slate-700 text-sm mb-3">
          1. Select collections to include
        </h2>

        {uploads.length === 0 ? (
          <div className="card p-8 text-center text-slate-400 text-sm">
            No uploads yet. Upload a collection.db first.
          </div>
        ) : (
          <div className="space-y-2">
            {uploads.map((upload) => {
              const isExpanded = expandedUploadIds.has(upload.id);
              const cols = uploadCollections.get(upload.id) ?? [];
              const isLoading = loadingUploadId === upload.id;

              return (
                <div key={upload.id} className="card overflow-hidden">
                  {/* Upload header */}
                  <button
                    onClick={() => toggleUpload(upload.id)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          'text-slate-400 transition-transform',
                          isExpanded && 'rotate-90'
                        )}
                      >
                        ▶
                      </span>
                      <div>
                        <span className="font-medium text-sm text-slate-900">
                          {upload.uploaderName}
                        </span>
                        <span className="text-xs text-slate-400 ml-2">
                          {pluralise(upload.collectionCount, 'collection')}
                        </span>
                      </div>
                    </div>
                    {isLoading && (
                      <svg className="animate-spin w-4 h-4 text-brand-500" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    )}
                  </button>

                  {/* Collections list */}
                  {isExpanded && !isLoading && (
                    <div className="border-t border-slate-100">
                      {cols.length === 0 ? (
                        <p className="text-xs text-slate-400 px-4 py-3">No collections.</p>
                      ) : (
                        cols.map((c) => {
                          const checked = isCollectionSelected(c.id);
                          return (
                            <label
                              key={c.id}
                              className={cn(
                                'flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors text-sm',
                                checked ? 'bg-brand-50' : 'hover:bg-slate-50'
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleCollection(c, upload)}
                                className="accent-brand-500 w-4 h-4 rounded"
                              />
                              <span className="flex-1 truncate text-slate-800">
                                {c.name || <em className="text-slate-400">unnamed</em>}
                              </span>
                              <span className="text-xs text-slate-400 shrink-0">
                                {c.mapCount.toLocaleString()} maps
                              </span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right: Merge config + export */}
      <div className="lg:col-span-2">
        <h2 className="font-semibold text-slate-700 text-sm mb-3">2. Configure & export</h2>

        <div className="card p-4 mb-4">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
            Deduplication
          </div>
          <div className="flex flex-col gap-2">
            <label className="flex items-start gap-2 cursor-pointer text-sm">
              <input
                type="radio"
                name="dedup"
                value="merge-same-name"
                checked={dedup === 'merge-same-name'}
                onChange={() => setDedup('merge-same-name')}
                className="mt-0.5 accent-brand-500"
              />
              <div>
                <div className="font-medium text-slate-800">Merge same-named</div>
                <div className="text-xs text-slate-400">
                  Collections with the same output name are merged and maps deduplicated by hash.
                </div>
              </div>
            </label>
            <label className="flex items-start gap-2 cursor-pointer text-sm">
              <input
                type="radio"
                name="dedup"
                value="keep-separate"
                checked={dedup === 'keep-separate'}
                onChange={() => setDedup('keep-separate')}
                className="mt-0.5 accent-brand-500"
              />
              <div>
                <div className="font-medium text-slate-800">Keep separate</div>
                <div className="text-xs text-slate-400">
                  Each collection is kept as-is (maps deduped within each collection only).
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Selected list */}
        {selected.length > 0 ? (
          <div className="card mb-4 overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600">
                {selected.length} selected · {uniqueOutputNames.size} output collections ·{' '}
                {totalSelectedMaps.toLocaleString()} maps
              </span>
              <button
                onClick={() => setSelected([])}
                className="text-xs text-slate-400 hover:text-red-500"
              >
                Clear all
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
              {selected.map((s) => (
                <div key={s.collectionId} className="flex items-center gap-2 px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={s.outputName}
                      onChange={(e) => updateOutputName(s.collectionId, e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-brand-400"
                      placeholder={s.originalName || 'Collection name'}
                    />
                    <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                      from {s.uploadName} · {s.mapCount.toLocaleString()} maps
                    </div>
                  </div>
                  <button
                    onClick={() => removeSelected(s.collectionId)}
                    className="text-slate-300 hover:text-red-400 text-lg leading-none shrink-0"
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="card p-4 mb-4 text-center text-slate-400 text-xs">
            No collections selected yet. Check some on the left.
          </div>
        )}

        {/* Export error / success */}
        {exportError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
            {exportError}
          </p>
        )}
        {exportSuccess && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-3">
            ✅ collection.db downloaded!
          </p>
        )}

        <button
          onClick={handleExport}
          disabled={selected.length === 0 || exporting}
          className="btn-primary w-full justify-center"
        >
          {exporting ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Exporting…
            </>
          ) : (
            <>⬇ Export collection.db</>
          )}
        </button>

        <p className="text-xs text-slate-400 mt-2 text-center">
          Output is a valid osu! stable collection.db
        </p>
      </div>
    </div>
  );
}
