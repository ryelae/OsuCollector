/**
 * Lightweight browser-compatible collection.db parser.
 * Only extracts collection names and map counts (skips hashes) for fast preview.
 * Uses DataView / ArrayBuffer — no Node.js APIs, safe to import in client components.
 */

export interface CollectionPreview {
  index: number;
  name: string;
  mapCount: number;
}

export function previewCollectionDb(buffer: ArrayBuffer): CollectionPreview[] {
  const view = new DataView(buffer);
  const decoder = new TextDecoder('utf-8');
  let offset = 0;

  function readUInt8(): number {
    return view.getUint8(offset++);
  }

  function readInt32LE(): number {
    const val = view.getInt32(offset, true);
    offset += 4;
    return val;
  }

  function readULEB128(): number {
    let result = 0;
    let shift = 0;
    for (;;) {
      const byte = readUInt8();
      result |= (byte & 0x7f) << shift;
      if ((byte & 0x80) === 0) break;
      shift += 7;
    }
    return result;
  }

  function readOsuString(): string {
    const indicator = readUInt8();
    if (indicator === 0x00) return '';
    if (indicator !== 0x0b) throw new Error(`Invalid string indicator: 0x${indicator.toString(16)}`);
    const length = readULEB128();
    const bytes = new Uint8Array(buffer, offset, length);
    offset += length;
    return decoder.decode(bytes);
  }

  function skipOsuString(): void {
    const indicator = readUInt8();
    if (indicator === 0x00) return;
    if (indicator !== 0x0b) throw new Error(`Invalid string indicator: 0x${indicator.toString(16)}`);
    const length = readULEB128();
    offset += length;
  }

  if (buffer.byteLength < 8) throw new Error('File too small to be a valid collection.db');

  const version = readInt32LE();
  if (version < 20000000 || version > 99999999) {
    throw new Error(`Unrecognised version ${version} — is this a collection.db from osu! stable?`);
  }

  const numCollections = readInt32LE();
  if (numCollections < 0 || numCollections > 1_000_000) {
    throw new Error(`Implausible collection count: ${numCollections}`);
  }

  const collections: CollectionPreview[] = [];

  for (let i = 0; i < numCollections; i++) {
    const name = readOsuString();
    const mapCount = readInt32LE();
    // Skip all hashes — we only need names and counts for preview
    for (let j = 0; j < mapCount; j++) skipOsuString();
    collections.push({ index: i, name, mapCount });
  }

  return collections;
}
