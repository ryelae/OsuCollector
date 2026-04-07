import { listUploads } from '@/lib/db';
import { MergeBuilder } from '@/components/merge-builder';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Merge & Export' };

interface Props {
  searchParams: { include?: string };
}

export default function MergePage({ searchParams }: Props) {
  const uploads = listUploads();

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-4 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-500 dark:text-slate-400">
        This feature is available here for convenience but is largely superseded by the desktop app, which handles downloading missing maps directly to your osu! Songs folder.
      </div>

      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Merge & Export</h1>
        <p className="text-slate-500 text-sm mt-1">
          Pick collections from any uploads, optionally rename them, then download a merged{' '}
          <code className="bg-slate-100 dark:bg-slate-700 dark:text-slate-300 px-1 rounded font-mono text-xs">collection.db</code>.
        </p>
      </div>

      <MergeBuilder
        initialUploads={uploads}
        initialIncludeId={searchParams.include}
      />
    </div>
  );
}
