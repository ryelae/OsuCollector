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
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Compare uploads</h1>
        <p className="text-slate-500 text-sm mt-1">
          Select two uploads to see which collections they share and how their maps overlap.
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
          Full comparison and missing-map downloads are handled by the desktop app.
        </p>
      </div>

      {uploads.length < 2 ? (
        <div className="card p-10 text-center text-slate-400">
          <div className="text-4xl mb-3">🔀</div>
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
