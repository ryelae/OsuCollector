import { listUploads } from '@/lib/db';
import { MergeBuilder } from '@/components/merge-builder';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Merge & Export' };

interface Props {
  searchParams: { include?: string };
}

export default function MergePage({ searchParams }: Props) {
  const uploads = listUploads();

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Merge & Export</h1>
        <p className="text-slate-500 text-sm mt-1">
          Pick collections from any uploads, optionally rename them, then download a merged{' '}
          <code className="bg-slate-100 dark:bg-slate-700 dark:text-slate-300 px-1 rounded font-mono text-xs">collection.db</code>.
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
          For downloading missing maps, use the desktop app instead.
        </p>
      </div>

      <MergeBuilder
        initialUploads={uploads}
        initialIncludeId={searchParams.include}
      />
    </div>
  );
}
