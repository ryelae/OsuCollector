/**
 * Writer for osu! stable collection.db binary format.
 * Produces files compatible with osu! stable.
 */

export interface CollectionToWrite {
  name: string;
  beatmapHashes: string[];
}

export interface CollectionDbData {
  /** osu! game version to embed; defaults to a known-good stable version */
  version?: number;
  collections: CollectionToWrite[];
}

class BufferWriter {
  private chunks: Buffer[] = [];

  writeUInt8(value: number): void {
    const b = Buffer.allocUnsafe(1);
    b.writeUInt8(value & 0xff, 0);
    this.chunks.push(b);
  }

  writeInt32LE(value: number): void {
    const b = Buffer.allocUnsafe(4);
    b.writeInt32LE(value, 0);
    this.chunks.push(b);
  }

  writeULEB128(value: number): void {
    if (value < 0) throw new Error('ULEB128 value must be non-negative');
    const bytes: number[] = [];
    do {
      let byte = value & 0x7f;
      value >>>= 7;
      if (value !== 0) byte |= 0x80;
      bytes.push(byte);
    } while (value !== 0);
    this.chunks.push(Buffer.from(bytes));
  }

  writeOsuString(str: string | null | undefined): void {
    if (str == null || str === '') {
      // Empty string: 0x0b indicator + ULEB128(0)
      this.writeUInt8(0x0b);
      this.writeULEB128(0);
      return;
    }
    this.writeUInt8(0x0b);
    const encoded = Buffer.from(str, 'utf8');
    this.writeULEB128(encoded.length);
    this.chunks.push(encoded);
  }

  toBuffer(): Buffer {
    return Buffer.concat(this.chunks);
  }
}

/**
 * Serialize collections to a binary collection.db buffer suitable for osu! stable.
 */
export function writeCollectionDb(data: CollectionDbData): Buffer {
  const writer = new BufferWriter();
  // Use the provided version or a safe known-good stable version
  const version = data.version ?? 20220213;

  writer.writeInt32LE(version);
  writer.writeInt32LE(data.collections.length);

  for (const collection of data.collections) {
    writer.writeOsuString(collection.name);
    writer.writeInt32LE(collection.beatmapHashes.length);
    for (const hash of collection.beatmapHashes) {
      writer.writeOsuString(hash);
    }
  }

  return writer.toBuffer();
}
