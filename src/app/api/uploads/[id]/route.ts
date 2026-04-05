import { getUpload, getCollections, deleteUpload } from '@/lib/db';
import { checkRequestAuth } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  if (!checkRequestAuth(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const upload = getUpload(params.id);
  if (!upload) {
    return Response.json({ error: 'Upload not found' }, { status: 404 });
  }

  const collections = getCollections(upload.id);
  return Response.json({ upload, collections });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  if (!checkRequestAuth(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ok = deleteUpload(params.id);
  if (!ok) {
    return Response.json({ error: 'Upload not found' }, { status: 404 });
  }

  return Response.json({ ok: true });
}
