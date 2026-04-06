import { NextResponse } from 'next/server'
import { getCollection, getCollectionHashes } from '@/lib/db'

export async function GET(
  _req: Request,
  { params }: { params: { id: string; collectionId: string } }
) {
  const collection = getCollection(params.collectionId)

  if (!collection || collection.uploadId !== params.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const hashes = getCollectionHashes(params.collectionId)
  return NextResponse.json({ hashes })
}
