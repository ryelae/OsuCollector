import Link from 'next/link';
import { listUploads } from '@/lib/db';
import { pluralise, formatRelativeDate } from '@/lib/utils';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Home' };

export default function HomePage() {
  const uploads = listUploads();
  const totalCollections = uploads.reduce((s, u) => s + u.collectionCount, 0);
  const totalMaps = uploads.reduce((s, u) => s + u.totalMaps, 0);
  const recentUploads = uploads.slice(0, 5);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">osu! Collection Hub</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Share and merge <strong>osu! stable</strong> collections with friends.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="stat-card">
          <span className="text-2xl font-bold text-slate-900">{uploads.length}</span>
          <span className="text-xs text-slate-500">Uploads</span>
        </div>
        <div className="stat-card">
          <span className="text-2xl font-bold text-slate-900">
            {totalCollections.toLocaleString()}
          </span>
          <span className="text-xs text-slate-500">Collections</span>
        </div>
        <div className="stat-card">
          <span className="text-2xl font-bold text-slate-900">{totalMaps.toLocaleString()}</span>
          <span className="text-xs text-slate-500">Map entries</span>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 mb-8 sm:grid-cols-3">
        <Link href="/uploads" className="card p-4 hover:bg-slate-50 transition-colors group">
          <div className="text-2xl mb-2">📤</div>
          <div className="font-medium text-sm text-slate-900 group-hover:text-brand-600">
            Upload
          </div>
          <div className="text-xs text-slate-500 mt-0.5">Add your collection.db</div>
        </Link>
        <Link href="/compare" className="card p-4 hover:bg-slate-50 transition-colors group">
          <div className="text-2xl mb-2">🔀</div>
          <div className="font-medium text-sm text-slate-900 group-hover:text-brand-600">
            Compare
          </div>
          <div className="text-xs text-slate-500 mt-0.5">Diff two uploads</div>
        </Link>
        <Link href="/merge" className="card p-4 hover:bg-slate-50 transition-colors group">
          <div className="text-2xl mb-2">🗂️</div>
          <div className="font-medium text-sm text-slate-900 group-hover:text-brand-600">
            Merge & Export
          </div>
          <div className="text-xs text-slate-500 mt-0.5">Build a new collection.db</div>
        </Link>
      </div>

      {/* Recent uploads */}
      {recentUploads.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-900 text-sm">Recent uploads</h2>
            <Link href="/uploads" className="text-xs text-brand-600 hover:underline">
              View all →
            </Link>
          </div>
          <div className="card divide-y divide-slate-100">
            {recentUploads.map((u) => (
              <Link
                key={u.id}
                href={`/uploads/${u.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
              >
                <div className="min-w-0">
                  <span className="font-medium text-sm text-slate-900">{u.uploaderName}</span>
                  <span className="text-slate-400 text-xs ml-2">{formatRelativeDate(u.createdAt)}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  <span className="badge-pink">{pluralise(u.collectionCount, 'collection')}</span>
                  <span className="badge-slate">{u.totalMaps.toLocaleString()} maps</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {uploads.length === 0 && (
        <div className="card p-10 text-center text-slate-400">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-sm">No uploads yet. Start by uploading your collection.db!</p>
          <Link href="/uploads" className="btn-primary mt-4 inline-flex">
            Upload now →
          </Link>
        </div>
      )}
    </div>
  );
}
