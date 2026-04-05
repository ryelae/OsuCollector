'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { cn, pluralise } from '@/lib/utils';
import { previewCollectionDb, type CollectionPreview } from '@/lib/collection-preview';

interface UploadResult {
  id: string;
  uploaderName: string;
  collectionCount: number;
  totalMaps: number;
}

type Status =
  | { type: 'idle' }
  | { type: 'parsing' }
  | { type: 'selecting'; collections: CollectionPreview[] }
  | { type: 'uploading' }
  | { type: 'success'; result: UploadResult }
  | { type: 'error'; message: string };

export function UploadForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<File | null>(null);

  const [dragging, setDragging] = useState(false);
  const [uploaderName, setUploaderName] = useState('');
  const [status, setStatus] = useState<Status>({ type: 'idle' });
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [selectError, setSelectError] = useState('');

  const reset = () => {
    fileRef.current = null;
    setStatus({ type: 'idle' });
    setSelectedIndices(new Set());
    if (inputRef.current) inputRef.current.value = '';
  };

  const parseFile = useCallback(async (f: File) => {
    if (f.name !== 'collection.db') {
      setStatus({ type: 'error', message: `Expected "collection.db", got "${f.name}"` });
      return;
    }
    if (f.size > 50 * 1024 * 1024) {
      setStatus({ type: 'error', message: 'File too large (max 50 MB)' });
      return;
    }

    setStatus({ type: 'parsing' });
    fileRef.current = f;

    try {
      const buffer = await f.arrayBuffer();
      const collections = previewCollectionDb(buffer);
      // Default: all selected
      setSelectedIndices(new Set(collections.map((c) => c.index)));
      setStatus({ type: 'selecting', collections });
    } catch (e) {
      setStatus({ type: 'error', message: `Could not read file: ${(e as Error).message}` });
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) parseFile(f);
    },
    [parseFile]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) parseFile(f);
  };

  const toggleIndex = (idx: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleAll = (collections: CollectionPreview[], value: boolean) => {
    setSelectedIndices(value ? new Set(collections.map((c) => c.index)) : new Set());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileRef.current || status.type !== 'selecting') return;
    if (selectedIndices.size === 0) {
      setSelectError('Select at least one collection.');
      return;
    }
    setSelectError('');

    setStatus({ type: 'uploading' });

    const fd = new FormData();
    fd.append('file', fileRef.current);
    fd.append('uploaderName', uploaderName.trim());
    fd.append('selectedIndices', JSON.stringify(Array.from(selectedIndices)));

    try {
      const res = await fetch('/api/uploads', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        setStatus({ type: 'error', message: data.error ?? 'Upload failed' });
        return;
      }
      setStatus({ type: 'success', result: data as UploadResult });
      router.refresh();
    } catch {
      setStatus({ type: 'error', message: 'Network error. Please try again.' });
    }
  };

  // ── Success ──────────────────────────────────────────────────────────────
  if (status.type === 'success') {
    const r = status.result;
    return (
      <div className="card p-6">
        <div className="flex items-start gap-4">
          <div className="text-3xl">✅</div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900 mb-1">Upload successful!</h3>
            <p className="text-sm text-slate-600">
              <span className="font-medium">{r.collectionCount}</span>{' '}
              {r.collectionCount === 1 ? 'collection' : 'collections'} ·{' '}
              <span className="font-medium">{r.totalMaps.toLocaleString()}</span> maps
            </p>
            <div className="flex gap-2 mt-4">
              <a href={`/uploads/${r.id}`} className="btn-primary">View Upload →</a>
              <button onClick={reset} className="btn-secondary">Upload Another</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Collection picker ─────────────────────────────────────────────────────
  if (status.type === 'selecting') {
    const { collections } = status;
    const totalSelectedMaps = collections
      .filter((c) => selectedIndices.has(c.index))
      .reduce((s, c) => s + c.mapCount, 0);

    return (
      <div className="card p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-semibold text-slate-900">Choose collections to upload</h2>
          <button onClick={reset} className="text-xs text-slate-400 hover:text-slate-600">
            ← Change file
          </button>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          {fileRef.current?.name} · {pluralise(collections.length, 'collection')} found
        </p>

        {/* Select all / none */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex gap-3 text-xs">
            <button
              type="button"
              onClick={() => toggleAll(collections, true)}
              className="text-brand-600 hover:underline"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={() => toggleAll(collections, false)}
              className="text-slate-400 hover:underline"
            >
              Deselect all
            </button>
          </div>
          <span className="text-xs text-slate-500">
            {selectedIndices.size} / {collections.length} selected ·{' '}
            {totalSelectedMaps.toLocaleString()} maps
          </span>
        </div>

        {/* Collection list */}
        <div className="border border-slate-200 rounded-lg overflow-hidden mb-4 max-h-72 overflow-y-auto">
          {collections.map((c) => {
            const checked = selectedIndices.has(c.index);
            return (
              <label
                key={c.index}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors text-sm border-b border-slate-100 last:border-0',
                  checked ? 'bg-brand-50' : 'hover:bg-slate-50'
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleIndex(c.index)}
                  className="accent-brand-500 w-4 h-4 shrink-0"
                />
                <span className="flex-1 truncate text-slate-800" title={c.name}>
                  {c.name || <em className="text-slate-400">unnamed</em>}
                </span>
                <span className="text-xs text-slate-400 shrink-0">
                  {c.mapCount.toLocaleString()} maps
                </span>
              </label>
            );
          })}
        </div>

        {/* Uploader name + submit */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label htmlFor="uploader-name" className="block text-sm font-medium text-slate-700 mb-1">
              Your name <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              id="uploader-name"
              type="text"
              className="input"
              placeholder="e.g. cookiezi"
              value={uploaderName}
              onChange={(e) => setUploaderName(e.target.value)}
              maxLength={60}
            />
          </div>

          {selectError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {selectError}
            </p>
          )}

          <button
            type="submit"
            disabled={selectedIndices.size === 0}
            className="btn-primary self-start"
          >
            Upload {selectedIndices.size} {selectedIndices.size === 1 ? 'collection' : 'collections'}
          </button>
        </form>
      </div>
    );
  }

  // ── Drop zone ─────────────────────────────────────────────────────────────
  return (
    <div className="card p-6">
      <h2 className="font-semibold text-slate-900 mb-4">Upload collection.db</h2>

      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          className={cn(
            'border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer w-full',
            dragging
              ? 'border-brand-400 bg-brand-50'
              : 'border-slate-200 bg-slate-50 hover:border-brand-300 hover:bg-brand-50/50'
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".db"
            onChange={handleChange}
            className="hidden"
          />
          {status.type === 'parsing' ? (
            <div className="flex flex-col items-center gap-2">
              <svg className="animate-spin w-6 h-6 text-brand-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm text-slate-500">Reading file…</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <span className="text-3xl">☁️</span>
              <span className="text-sm font-medium text-slate-700">
                Drop <code className="font-mono bg-slate-100 px-1 rounded">collection.db</code> here
              </span>
              <span className="text-xs text-slate-400">or click to browse</span>
            </div>
          )}
        </button>

        {status.type === 'error' && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {status.message}
          </p>
        )}

        <details className="text-xs text-slate-400">
          <summary className="cursor-pointer hover:text-slate-500">
            Where do I find collection.db?
          </summary>
          <p className="mt-2 bg-slate-50 rounded p-2 leading-relaxed">
            On Windows:{' '}
            <code className="bg-slate-100 px-1 rounded">%APPDATA%\osu!\collection.db</code>
            <br />
            Paste that path into File Explorer&apos;s address bar and copy the file here.
            Must be <strong>osu! stable</strong>, not osu!lazer.
          </p>
        </details>
      </div>
    </div>
  );
}
