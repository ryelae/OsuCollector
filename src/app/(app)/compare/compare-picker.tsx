'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Upload } from '@/lib/db';

interface Props {
  uploads: Upload[];
  initialLeft?: string;
  initialRight?: string;
}

export function ComparePicker({ uploads, initialLeft, initialRight }: Props) {
  const router = useRouter();
  const [left, setLeft] = useState(
    initialLeft && uploads.find((u) => u.id === initialLeft) ? initialLeft : (uploads[0]?.id ?? '')
  );
  const [right, setRight] = useState(
    initialRight && uploads.find((u) => u.id === initialRight)
      ? initialRight
      : (uploads[1]?.id ?? '')
  );

  const canCompare = left && right && left !== right;

  const handleCompare = () => {
    if (canCompare) {
      router.push(`/compare/${left}/${right}`);
    }
  };

  const label = (u: Upload) =>
    `${u.uploaderName} — ${u.collectionCount} collections (${new Date(u.createdAt).toLocaleDateString()})`;

  return (
    <div className="card p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Left upload</label>
          <select
            className="input"
            value={left}
            onChange={(e) => setLeft(e.target.value)}
          >
            {uploads.map((u) => (
              <option key={u.id} value={u.id} disabled={u.id === right}>
                {label(u)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Right upload</label>
          <select
            className="input"
            value={right}
            onChange={(e) => setRight(e.target.value)}
          >
            {uploads.map((u) => (
              <option key={u.id} value={u.id} disabled={u.id === left}>
                {label(u)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {left === right && left !== '' && (
        <p className="text-sm text-amber-600 dark:text-amber-400 mt-3">Select two different uploads to compare.</p>
      )}

      <button
        onClick={handleCompare}
        disabled={!canCompare}
        className="btn-primary mt-4"
      >
        Compare →
      </button>
    </div>
  );
}
