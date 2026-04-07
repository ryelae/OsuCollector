import Link from 'next/link';
import { listUploads } from '@/lib/db';
import { formatRelativeDate, pluralise } from '@/lib/utils';
import { UploadForm } from '@/components/upload-form';
import { DeleteUploadButton } from './[id]/delete-button';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Uploads' };

export default function UploadsPage() {
  const uploads = listUploads();

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Uploads</h1>
        <p className="text-slate-500 text-sm mt-1">
          Upload a <code className="bg-slate-100 dark:bg-slate-700 dark:text-slate-300 px-1 rounded font-mono text-xs">collection.db</code>{' '}
          from osu! stable to share it here.
        </p>
      </div>

      <div className="mb-8">
        <UploadForm />
      </div>

      {/* Upload list */}
      {uploads.length === 0 ? (
        <div className="card p-8 text-center text-slate-400">
          <p className="text-sm">No uploads yet — use the form above to get started.</p>
        </div>
      ) : (
        <div>
          <h2 className="font-semibold text-slate-700 dark:text-slate-300 text-sm mb-3">
            {pluralise(uploads.length, 'upload')}
          </h2>
          <div className="card divide-y divide-slate-100 dark:divide-slate-700">
            {uploads.map((u) => (
              <div key={u.id} className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/uploads/${u.id}`}
                    className="font-medium text-sm text-slate-900 dark:text-slate-100 hover:text-brand-600"
                  >
                    {u.uploaderName}
                  </Link>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {u.originalFilename} · osu! v{u.parserVersion}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="badge-pink">{pluralise(u.collectionCount, 'collection')}</span>
                  <span className="badge-slate">{u.totalMaps.toLocaleString()} maps</span>
                  <span className="text-xs text-slate-400">{formatRelativeDate(u.createdAt)}</span>
                  <Link href={`/uploads/${u.id}`} className="btn-secondary text-xs px-2 py-1">
                    View →
                  </Link>
                  <DeleteUploadButton uploadId={u.id} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
