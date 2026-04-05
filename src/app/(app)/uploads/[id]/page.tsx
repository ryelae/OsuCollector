import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getUpload, getCollections } from '@/lib/db';
import { formatDate, pluralise } from '@/lib/utils';
import { DeleteUploadButton } from './delete-button';
import { CopyLinkButton } from './copy-link-button';
import type { Metadata } from 'next';

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const upload = getUpload(params.id);
  if (!upload) return { title: 'Not found' };
  return { title: `${upload.uploaderName}'s upload` };
}

export default function UploadDetailPage({ params }: Props) {
  const upload = getUpload(params.id);
  if (!upload) notFound();

  const collections = getCollections(upload.id);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back */}
      <Link href="/uploads" className="text-sm text-slate-500 hover:text-slate-700 mb-4 inline-flex items-center gap-1">
        ← All uploads
      </Link>

      {/* Header */}
      <div className="card p-5 mb-4 mt-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{upload.uploaderName}</h1>
            <p className="text-sm text-slate-500 mt-1">
              {upload.originalFilename} · osu! stable v{upload.parserVersion}
            </p>
            <p className="text-xs text-slate-400 mt-1">{formatDate(upload.createdAt)}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <CopyLinkButton uploadId={upload.id} />
            <DeleteUploadButton uploadId={upload.id} />
          </div>
        </div>

        {/* Stats row */}
        <div className="flex gap-6 mt-4 pt-4 border-t border-slate-100">
          <div>
            <div className="text-lg font-bold text-slate-900">{upload.collectionCount}</div>
            <div className="text-xs text-slate-500">Collections</div>
          </div>
          <div>
            <div className="text-lg font-bold text-slate-900">
              {upload.totalMaps.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500">Total map entries</div>
          </div>
        </div>

        {/* Quick compare/merge links */}
        <div className="flex gap-2 mt-4">
          <Link
            href={`/compare?left=${upload.id}`}
            className="btn-secondary text-xs"
          >
            Compare with…
          </Link>
          <Link
            href={`/merge?include=${upload.id}`}
            className="btn-secondary text-xs"
          >
            Include in Merge
          </Link>
        </div>
      </div>

      {/* Collections */}
      <h2 className="font-semibold text-slate-700 text-sm mb-2">
        {pluralise(collections.length, 'collection')}
      </h2>

      {collections.length === 0 ? (
        <div className="card p-6 text-center text-slate-400 text-sm">No collections found.</div>
      ) : (
        <div className="card divide-y divide-slate-100">
          {collections.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-4 py-2.5">
              <span className="text-sm text-slate-800 truncate max-w-[60%]" title={c.name}>
                {c.name || <span className="italic text-slate-400">(unnamed)</span>}
              </span>
              <span className="text-xs text-slate-500 shrink-0">
                {c.mapCount.toLocaleString()} maps
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
