/**
 * Shared float-vector <-> Bytes packing for CardReferenceEmbedding.vector
 * (prisma/schema.prisma) and the cosine-similarity math retrieval needs —
 * factored out once rather than duplicated between embedding-index.ts
 * (writes) and embedding-similarity-retriever.ts (reads + compares), same
 * "small shared helper, not a new abstraction layer" bar as
 * reference-index.ts's sha256Hex().
 *
 * Float32 (not float64) — half the storage for a difference in precision
 * that doesn't matter for cosine similarity over a few hundred/thousand
 * dims, and it's what the embedding APIs themselves return over the wire
 * as JSON numbers anyway (no float64-only source of truth being discarded).
 */

/**
 * Packs an embedding's values into a Uint8Array of little-endian Float32s.
 * Deliberately `new Uint8Array(...)` + DataView rather than Node's `Buffer`
 * — Prisma's generated `Bytes` field type is `Uint8Array<ArrayBuffer>`, and
 * `Buffer.alloc()`'s return type is the wider `Buffer<ArrayBufferLike>`
 * (it can back onto a SharedArrayBuffer), which TS rejects assigning
 * directly into a `data.vector` write; a plain `Uint8Array` always backs a
 * real `ArrayBuffer`, so it satisfies the field type with no cast needed.
 */
export function encodeEmbeddingValues(values: number[]): Uint8Array {
  const bytes = new Uint8Array(values.length * 4);
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < values.length; i++) {
    view.setFloat32(i * 4, values[i], true);
  }
  return bytes;
}

/** Inverse of encodeEmbeddingValues. `dims` is passed explicitly (from the row's own `dims` column) rather than inferred from buffer.length/4, so a truncated/corrupt row is caught as a length mismatch instead of silently reading fewer values. */
export function decodeEmbeddingValues(buffer: Buffer | Uint8Array, dims: number): number[] {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  if (buf.length !== dims * 4) {
    throw new Error(`decodeEmbeddingValues: expected ${dims * 4} bytes for dims=${dims}, got ${buf.length}`);
  }
  const values = new Array<number>(dims);
  for (let i = 0; i < dims; i++) {
    values[i] = buf.readFloatLE(i * 4);
  }
  return values;
}

/**
 * Cosine similarity, clamped to [0, 1] — embedding-similarity-retriever.ts
 * uses this directly as RecognitionCandidate.visualSimilarity, and every
 * other CardVision signal (ocrScore/metadataScore) is documented as 0..1,
 * so raw cosine's [-1, 1] range is remapped by clamping negative values to
 * 0 (a near-orthogonal-or-opposite match is "no visual evidence of a
 * match", not a negative score) rather than rescaling, which would inflate
 * an unrelated card's similarity into a misleadingly non-zero score.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`cosineSimilarity: dimension mismatch (${a.length} vs ${b.length})`);
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  const cosine = dot / (Math.sqrt(normA) * Math.sqrt(normB));
  return Math.max(0, Math.min(1, cosine));
}
