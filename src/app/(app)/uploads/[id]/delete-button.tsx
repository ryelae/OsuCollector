'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  uploadId: string;
  /** If provided, navigate here after successful delete. Otherwise just refresh in place. */
  redirectTo?: string;
}

export function DeleteUploadButton({ uploadId, redirectTo }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/uploads/${uploadId}`, { method: 'DELETE' });
      if (res.ok) {
        if (redirectTo) {
          router.push(redirectTo);
        }
        router.refresh();
      }
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  };

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">Sure?</span>
        <button onClick={handleDelete} disabled={loading} className="btn-danger text-xs">
          {loading ? 'Deleting…' : 'Yes, delete'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs text-slate-400 hover:text-slate-600"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button onClick={() => setConfirming(true)} className="btn-danger text-xs">
      Delete
    </button>
  );
}
