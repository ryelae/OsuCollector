import { listUploads } from '@/lib/db';
import { ComparePicker } from './compare-picker';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Compare' };

interface Props {
  searchParams: { left?: string; right?: string };
}

export default function ComparePage({ searchParams }: Props) {
  const uploads = listUploads();

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-4 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-500 dark:text-slate-400">
        This feature is available here for convenience but is largely superseded by the desktop app, which also handles downloading missing maps.
      </div>

      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Compare uploads</h1>
        <p className="text-slate-500 text-sm mt-1">
          Select two uploads to see which collections they share and how their maps overlap.
        </p>
      </div>

      {uploads.length < 2 ? (
        <div className="card p-10 text-center text-slate-400">
          <p className="text-sm">You need at least two uploads to compare.</p>
        </div>
      ) : (
        <ComparePicker
          uploads={uploads}
          initialLeft={searchParams.left}
          initialRight={searchParams.right}
        />
      )}
    </div>
  );
}
