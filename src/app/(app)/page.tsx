import Link from 'next/link';
import { listUploads } from '@/lib/db';
import { pluralise, formatRelativeDate } from '@/lib/utils';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
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
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">osu! Collection Hub</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Upload and share <strong>osu! stable</strong> collections with friends.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="stat-card">
          <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{uploads.length}</span>
          <span className="text-xs text-slate-500">Uploads</span>
        </div>
        <div className="stat-card">
          <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {totalCollections.toLocaleString()}
          </span>
          <span className="text-xs text-slate-500">Collections</span>
        </div>
        <div className="stat-card">
          <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalMaps.toLocaleString()}</span>
          <span className="text-xs text-slate-500">Map entries</span>
        </div>
      </div>

      {/* How to use */}
      <div className="card p-5 mb-8">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100 text-sm mb-4">How to use</h2>
        <ol className="flex flex-col gap-3">
          {[
            {
              step: '1',
              title: 'Find your collection.db',
              body: (
                <>
                  On Windows, open File Explorer and navigate to{' '}
                  <code className="bg-slate-100 dark:bg-slate-700 dark:text-slate-300 px-1 rounded font-mono text-xs">
                    %APPDATA%\osu!\collection.db
                  </code>
                  . <strong>Make sure osu! is closed first.</strong>
                </>
              ),
            },
            {
              step: '2',
              title: 'Upload your collections',
              body: 'Head to Uploads, drag in your collection.db, choose which collections to share, enter your name, and submit.',
            },
            {
              step: '3',
              title: 'Share the URL with friends',
              body: 'Anyone with the shared password can log in and see your upload. Each upload also has its own shareable link.',
            },
            {
              step: '4',
              title: 'Download missing maps via the desktop app',
              body: 'Open the desktop companion app, connect it to this site, browse your friends\' collections, and download any maps you\'re missing directly to your osu! Songs folder.',
            },
          ].map(({ step, title, body }) => (
            <li key={step} className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-500 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                {step}
              </span>
              <div>
                <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{title}</div>
                <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">{body}</div>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Recent uploads */}
      {recentUploads.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Recent uploads</h2>
            <Link href="/uploads" className="text-xs text-brand-600 hover:underline">
              View all →
            </Link>
          </div>
          <div className="card divide-y divide-slate-100 dark:divide-slate-700">
            {recentUploads.map((u) => (
              <Link
                key={u.id}
                href={`/uploads/${u.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="min-w-0">
                  <span className="font-medium text-sm text-slate-900 dark:text-slate-100">{u.uploaderName}</span>
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
          <p className="text-sm mb-4">No uploads yet. Start by uploading your collection.db.</p>
          <Link href="/uploads" className="btn-primary inline-flex">
            Go to Uploads
          </Link>
        </div>
      )}
    </div>
  );
}
