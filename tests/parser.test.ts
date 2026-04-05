import { parseCollectionDb } from '../src/lib/collection-parser';
import { writeCollectionDb } from '../src/lib/collection-writer';

// ---------------------------------------------------------------------------
// Helpers to build a binary collection.db for testing
// ---------------------------------------------------------------------------

function writeInt32LE(n: number): Buffer {
  const b = Buffer.allocUnsafe(4);
  b.writeInt32LE(n, 0);
  return b;
}

function writeULEB128(value: number): Buffer {
  const bytes: number[] = [];
  do {
    let byte = value & 0x7f;
    value >>>= 7;
    if (value !== 0) byte |= 0x80;
    bytes.push(byte);
  } while (value !== 0);
  return Buffer.from(bytes);
}

function writeOsuString(s: string): Buffer {
  if (s === '') return Buffer.from([0x0b, 0x00]);
  const encoded = Buffer.from(s, 'utf8');
  return Buffer.concat([Buffer.from([0x0b]), writeULEB128(encoded.length), encoded]);
}

function buildCollectionDb(
  version: number,
  collections: Array<{ name: string; hashes: string[] }>
): Buffer {
  const chunks: Buffer[] = [writeInt32LE(version), writeInt32LE(collections.length)];
  for (const { name, hashes } of collections) {
    chunks.push(writeOsuString(name), writeInt32LE(hashes.length));
    for (const h of hashes) chunks.push(writeOsuString(h));
  }
  return Buffer.concat(chunks);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('parseCollectionDb', () => {
  const VALID_VERSION = 20220213;
  const HASH_A = 'a'.repeat(32);
  const HASH_B = 'b'.repeat(32);

  test('parses an empty collection list', () => {
    const buf = buildCollectionDb(VALID_VERSION, []);
    const result = parseCollectionDb(buf);
    expect(result.version).toBe(VALID_VERSION);
    expect(result.collections).toHaveLength(0);
  });

  test('parses a single collection with no maps', () => {
    const buf = buildCollectionDb(VALID_VERSION, [{ name: 'Favorites', hashes: [] }]);
    const result = parseCollectionDb(buf);
    expect(result.collections).toHaveLength(1);
    expect(result.collections[0].name).toBe('Favorites');
    expect(result.collections[0].beatmapHashes).toHaveLength(0);
  });

  test('parses a single collection with maps', () => {
    const buf = buildCollectionDb(VALID_VERSION, [
      { name: 'All Maps', hashes: [HASH_A, HASH_B] },
    ]);
    const result = parseCollectionDb(buf);
    expect(result.collections[0].beatmapHashes).toEqual([HASH_A, HASH_B]);
  });

  test('parses multiple collections', () => {
    const collections = [
      { name: 'Streams', hashes: [HASH_A] },
      { name: 'Tech', hashes: [HASH_B, HASH_A] },
      { name: 'Empty', hashes: [] },
    ];
    const buf = buildCollectionDb(VALID_VERSION, collections);
    const result = parseCollectionDb(buf);

    expect(result.collections).toHaveLength(3);
    expect(result.collections[0].name).toBe('Streams');
    expect(result.collections[1].name).toBe('Tech');
    expect(result.collections[2].name).toBe('Empty');
    expect(result.collections[1].beatmapHashes).toHaveLength(2);
  });

  test('parses a collection with an empty name', () => {
    const buf = buildCollectionDb(VALID_VERSION, [{ name: '', hashes: [HASH_A] }]);
    const result = parseCollectionDb(buf);
    expect(result.collections[0].name).toBe('');
  });

  test('parses UTF-8 collection names correctly', () => {
    const name = '日本語コレクション 🎵';
    const buf = buildCollectionDb(VALID_VERSION, [{ name, hashes: [] }]);
    const result = parseCollectionDb(buf);
    expect(result.collections[0].name).toBe(name);
  });

  test('preserves version number', () => {
    const version = 20191107;
    const buf = buildCollectionDb(version, []);
    expect(parseCollectionDb(buf).version).toBe(version);
  });

  test('throws on a buffer that is too small', () => {
    expect(() => parseCollectionDb(Buffer.alloc(4))).toThrow();
  });

  test('throws on invalid version number', () => {
    const buf = Buffer.allocUnsafe(8);
    buf.writeInt32LE(12345, 0);      // bad version
    buf.writeInt32LE(0, 4);
    expect(() => parseCollectionDb(buf)).toThrow(/version/i);
  });

  test('throws on invalid string indicator byte', () => {
    const buf = buildCollectionDb(VALID_VERSION, []);
    // Manually corrupt: rewrite numCollections to 1, then add a bad string indicator
    const corrupt = Buffer.concat([
      buf.subarray(0, 4),
      writeInt32LE(1),
      Buffer.from([0xff]), // invalid indicator
    ]);
    expect(() => parseCollectionDb(corrupt)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Writer tests
// ---------------------------------------------------------------------------

describe('writeCollectionDb', () => {
  const HASH_A = 'a'.repeat(32);
  const HASH_B = 'b'.repeat(32);

  test('round-trips through parser with no collections', () => {
    const buf = writeCollectionDb({ collections: [] });
    const result = parseCollectionDb(buf);
    expect(result.collections).toHaveLength(0);
  });

  test('round-trips single collection', () => {
    const buf = writeCollectionDb({
      collections: [{ name: 'Favorites', beatmapHashes: [HASH_A, HASH_B] }],
    });
    const result = parseCollectionDb(buf);
    expect(result.collections).toHaveLength(1);
    expect(result.collections[0].name).toBe('Favorites');
    expect(result.collections[0].beatmapHashes).toEqual([HASH_A, HASH_B]);
  });

  test('round-trips multiple collections preserving order', () => {
    const input = [
      { name: 'A', beatmapHashes: [HASH_A] },
      { name: 'B', beatmapHashes: [] },
      { name: 'C', beatmapHashes: [HASH_B, HASH_A] },
    ];
    const buf = writeCollectionDb({ collections: input });
    const result = parseCollectionDb(buf);
    expect(result.collections.map((c) => c.name)).toEqual(['A', 'B', 'C']);
    expect(result.collections[2].beatmapHashes).toEqual([HASH_B, HASH_A]);
  });

  test('round-trips UTF-8 names', () => {
    const name = '한국어 컬렉션 🎮';
    const buf = writeCollectionDb({ collections: [{ name, beatmapHashes: [] }] });
    const result = parseCollectionDb(buf);
    expect(result.collections[0].name).toBe(name);
  });

  test('round-trips empty collection name', () => {
    const buf = writeCollectionDb({ collections: [{ name: '', beatmapHashes: [HASH_A] }] });
    const result = parseCollectionDb(buf);
    expect(result.collections[0].name).toBe('');
    expect(result.collections[0].beatmapHashes).toEqual([HASH_A]);
  });

  test('uses provided version', () => {
    const version = 20191107;
    const buf = writeCollectionDb({ version, collections: [] });
    expect(parseCollectionDb(buf).version).toBe(version);
  });

  test('defaults to a valid version when none provided', () => {
    const buf = writeCollectionDb({ collections: [] });
    const { version } = parseCollectionDb(buf);
    expect(version).toBeGreaterThan(20000000);
    expect(version).toBeLessThan(99999999);
  });

  test('produces a binary buffer', () => {
    const buf = writeCollectionDb({ collections: [] });
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(7);
  });
});
