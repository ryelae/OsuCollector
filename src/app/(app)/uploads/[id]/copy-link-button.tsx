'use client';

import { useState } from 'react';

export function CopyLinkButton({ uploadId }: { uploadId: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const url = `${window.location.origin}/uploads/${uploadId}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button onClick={handleCopy} className="btn-secondary text-xs">
      {copied ? '✅ Copied!' : '🔗 Share link'}
    </button>
  );
}
