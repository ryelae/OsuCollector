'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface UploadResult {
  id: string;
  uploaderName: string;
  collectionCount: number;
  totalMaps: number;
  version: number;
}

export function UploadForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploaderName, setUploaderName] = useState('');
  const [status, setStatus] = useState<
    | { type: 'idle' }
    | { type: 'uploading'; progress: number }
    | { type: 'success'; result: UploadResult }
    | { type: 'error'; message: string }
  >({ type: 'idle' });

  const reset = () => {
    setFile(null);
    setStatus({ type: 'idle' });
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleFile = useCallback((f: File) => {
    if (f.name !== 'collection.db') {
      setStatus({ type: 'error', message: `Expected "collection.db", got "${f.name}"` });
      return;
    }
    if (f.size > 50 * 1024 * 1024) {
      setStatus({ type: 'error', message: 'File too large (max 50 MB)' });
      return;
    }
    setFile(f);
    setStatus({ type: 'idle' });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) handleFile(dropped);
    },
    [handleFile]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };
  const handleDragLeave = () => setDragging(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setStatus({ type: 'uploading', progress: 0 });

    const fd = new FormData();
    fd.append('file', file);
    fd.append('uploaderName', uploaderName.trim());

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

  if (status.type === 'success') {
    const r = status.result;
    return (
      <div className="card p-6">
        <div className="flex items-start gap-4">
          <div className="text-3xl">✅</div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900 mb-1">Upload successful!</h3>
            <p className="text-sm text-slate-600">
              <span className="font-medium">{r.collectionCount}</span> collection
              {r.collectionCount !== 1 ? 's' : ''} ·{' '}
              <span className="font-medium">{r.totalMaps.toLocaleString()}</span> maps
            </p>
            <div className="flex gap-2 mt-4">
              <a href={`/uploads/${r.id}`} className="btn-primary">
                View Upload →
              </a>
              <button onClick={reset} className="btn-secondary">
                Upload Another
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <h2 className="font-semibold text-slate-900 mb-4">Upload collection.db</h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Drag-drop zone */}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            'border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer w-full',
            dragging
              ? 'border-brand-400 bg-brand-50'
              : file
              ? 'border-green-400 bg-green-50'
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
          {file ? (
            <div className="flex flex-col items-center gap-2">
              <span className="text-3xl">📂</span>
              <span className="font-medium text-slate-800 text-sm">{file.name}</span>
              <span className="text-xs text-slate-500">
                {(file.size / 1024).toFixed(0)} KB
              </span>
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

        {/* Uploader name */}
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

        {/* Error */}
        {status.type === 'error' && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {status.message}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={!file || status.type === 'uploading'}
            className="btn-primary"
          >
            {status.type === 'uploading' ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Uploading…
              </>
            ) : (
              'Upload'
            )}
          </button>

          {file && status.type !== 'uploading' && (
            <button type="button" onClick={reset} className="text-sm text-slate-500 hover:text-slate-700">
              Clear
            </button>
          )}
        </div>

        {/* Help text */}
        <details className="text-xs text-slate-400 mt-1">
          <summary className="cursor-pointer hover:text-slate-500">
            Where do I find collection.db?
          </summary>
          <p className="mt-2 bg-slate-50 rounded p-2 leading-relaxed">
            On Windows, it&apos;s usually at:{' '}
            <code className="bg-slate-100 px-1 rounded">
              %APPDATA%\osu!\collection.db
            </code>
            <br />
            Open File Explorer, paste that path in the address bar, and copy the file here.
            Make sure to use <strong>osu! stable</strong> (not osu!lazer).
          </p>
        </details>
      </form>
    </div>
  );
}
