import { describe, expect, it } from "vitest";
import { cosineSimilarity, decodeEmbeddingValues, encodeEmbeddingValues } from "./embedding-codec";

describe("encodeEmbeddingValues / decodeEmbeddingValues", () => {
  it("round-trips values within Float32 precision", () => {
    const values = [0, 1, -1, 0.5, -0.123456, 3.14159, 1e-6, -1e6];
    const encoded = encodeEmbeddingValues(values);
    expect(encoded.length).toBe(values.length * 4);
    const decoded = decodeEmbeddingValues(encoded, values.length);
    for (let i = 0; i < values.length; i++) {
      expect(decoded[i]).toBeCloseTo(values[i], 4);
    }
  });

  it("accepts a plain Uint8Array (e.g. straight from a Prisma Bytes column)", () => {
    const encoded = encodeEmbeddingValues([1, 2, 3]);
    const asUint8 = new Uint8Array(encoded);
    expect(decodeEmbeddingValues(asUint8, 3)).toEqual(decodeEmbeddingValues(encoded, 3));
  });

  it("throws on a dims/byte-length mismatch (a truncated or corrupt row)", () => {
    const encoded = encodeEmbeddingValues([1, 2, 3]);
    expect(() => decodeEmbeddingValues(encoded, 4)).toThrow(/expected 16 bytes/);
  });

  it("round-trips an empty vector", () => {
    expect(decodeEmbeddingValues(encodeEmbeddingValues([]), 0)).toEqual([]);
  });
});

describe("cosineSimilarity", () => {
  it("is 1 for identical vectors", () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 6);
  });

  it("is 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 6);
  });

  it("clamps a negative cosine (opposite vectors) to 0, not -1", () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBe(0);
  });

  it("is 0 when either vector is all-zero (no divide-by-zero NaN)", () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
    expect(cosineSimilarity([0, 0], [0, 0])).toBe(0);
  });

  it("scales correctly for parallel vectors of different magnitude", () => {
    expect(cosineSimilarity([1, 1], [2, 2])).toBeCloseTo(1, 6);
  });

  it("throws on a dimension mismatch", () => {
    expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow(/dimension mismatch/);
  });
});
