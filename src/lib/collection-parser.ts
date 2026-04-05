/**
 * Parser for osu! stable collection.db binary format.
 *
 * Format overview:
 *   [Int32LE]  version (osu! game version, e.g. 20220213)
 *   [Int32LE]  number of collections
 *   For each collection:
 *     [OsuString] collection name
 *     [Int32LE]   number of beatmaps
 *     For each beatmap:
 *       [OsuString] MD5 hash of the .osu file
 *
 * OsuString encoding:
 *   0x00         → null / empty string
 *   0x0b + ULEB128(len) + UTF-8 bytes → non-null string
 */

export interface ParsedCollection {
  name: string;
  beatmapHashes: string[];
}

export interface ParsedCollectionDb {
  version: number;
  collections: ParsedCollection[];
}

class BufferReader {
  private readonly buf: Buffer;
  private pos: number;

  constructor(buf: Buffer) {
    this.buf = buf;
    this.pos = 0;
  }

  get position(): number {
    return this.pos;
  }

  get remaining(): number {
    return this.buf.length - this.pos;
  }

  private assert(n: number): void {
    if (this.pos + n > this.buf.length) {
      throw new Error(
        `Unexpected end of buffer: need ${n} bytes at offset ${this.pos}, only ${this.remaining} remain`
      );
    }
  }

  readUInt8(): number {
    this.assert(1);
    return this.buf.readUInt8(this.pos++);
  }

  readInt32LE(): number {
    this.assert(4);
    const v = this.buf.readInt32LE(this.pos);
    this.pos += 4;
    return v;
  }

  readULEB128(): number {
    let result = 0;
    let shift = 0;
    for (;;) {
      const byte = this.readUInt8();
      result |= (byte & 0x7f) << shift;
      if ((byte & 0x80) === 0) break;
      shift += 7;
      if (shift > 28) throw new Error('ULEB128 value too large');
    }
    return result;
  }

  readOsuString(): string {
    const indicator = this.readUInt8();
    if (indicator === 0x00) return '';
    if (indicator !== 0x0b) {
      throw new Error(
        `Invalid osu! string indicator 0x${indicator.toString(16).padStart(2, '0')} at offset ${this.pos - 1}`
      );
    }
    const length = this.readULEB128();
    this.assert(length);
    const s = this.buf.toString('utf8', this.pos, this.pos + length);
    this.pos += length;
    return s;
  }
}

export function parseCollectionDb(data: Buffer): ParsedCollectionDb {
  if (data.length < 8) {
    throw new Error('File is too small to be a valid collection.db (< 8 bytes)');
  }

  const reader = new BufferReader(data);
  const version = reader.readInt32LE();

  // Sanity-check: osu! stable versions are 8-digit numbers like 20191107
  if (version < 20000000 || version > 99999999) {
    throw new Error(
      `Unrecognised version number ${version}. This may not be an osu! stable collection.db.`
    );
  }

  const numCollections = reader.readInt32LE();
  if (numCollections < 0 || numCollections > 1_000_000) {
    throw new Error(`Implausible collection count: ${numCollections}`);
  }

  const collections: ParsedCollection[] = [];

  for (let i = 0; i < numCollections; i++) {
    let name: string;
    try {
      name = reader.readOsuString();
    } catch (e) {
      throw new Error(`Failed reading name of collection #${i + 1}: ${(e as Error).message}`);
    }

    const numBeatmaps = reader.readInt32LE();
    if (numBeatmaps < 0 || numBeatmaps > 10_000_000) {
      throw new Error(`Implausible beatmap count ${numBeatmaps} in collection "${name}"`);
    }

    const beatmapHashes: string[] = [];
    for (let j = 0; j < numBeatmaps; j++) {
      let hash: string;
      try {
        hash = reader.readOsuString();
      } catch (e) {
        throw new Error(
          `Failed reading hash #${j + 1} in collection "${name}": ${(e as Error).message}`
        );
      }
      beatmapHashes.push(hash);
    }

    collections.push({ name, beatmapHashes });
  }

  return { version, collections };
}
