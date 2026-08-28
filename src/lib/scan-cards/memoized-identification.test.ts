import { describe, expect, it } from "vitest";
import { createMemoizedIdentificationStrategy } from "./memoized-identification";
import type { IdentificationInput, IdentificationOutput, IdentificationStrategy } from "@/lib/scanning/identify/types";
import type { ImageRef } from "@/lib/scanning";

function fakeStrategy(): { strategy: IdentificationStrategy; calls: IdentificationInput[] } {
  const calls: IdentificationInput[] = [];
  const strategy: IdentificationStrategy = {
    id: "fake",
    async identify(input: IdentificationInput): Promise<IdentificationOutput> {
      calls.push(input);
      return {
        status: "identified",
        identificationConfidence: 0.9,
        candidates: [],
        error: null,
      };
    },
  };
  return { strategy, calls };
}

const image: ImageRef = { kind: "inline", base64: "abc123", mimeType: "image/jpeg" };
const otherImage: ImageRef = { kind: "inline", base64: "different", mimeType: "image/jpeg" };

describe("createMemoizedIdentificationStrategy", () => {
  it("calls the wrapped strategy once for identical crop content", async () => {
    const { strategy, calls } = fakeStrategy();
    const memoized = createMemoizedIdentificationStrategy(strategy);

    await Promise.all([
      memoized.identify({ croppedImage: image }),
      memoized.identify({ croppedImage: image }),
      memoized.identify({ croppedImage: image }),
    ]);

    expect(calls).toHaveLength(1);
  });

  it("calls the wrapped strategy once per distinct crop", async () => {
    const { strategy, calls } = fakeStrategy();
    const memoized = createMemoizedIdentificationStrategy(strategy);

    await Promise.all([
      memoized.identify({ croppedImage: image }),
      memoized.identify({ croppedImage: otherImage }),
    ]);

    expect(calls).toHaveLength(2);
  });

  it("does not cache across different gameHints for the same image", async () => {
    const { strategy, calls } = fakeStrategy();
    const memoized = createMemoizedIdentificationStrategy(strategy);

    await memoized.identify({ croppedImage: image, gameHint: "pokemon" });
    await memoized.identify({ croppedImage: image, gameHint: "riftbound" });

    expect(calls).toHaveLength(2);
  });

  it("passes a null croppedImage straight through, uncached", async () => {
    const { strategy, calls } = fakeStrategy();
    const memoized = createMemoizedIdentificationStrategy(strategy);

    await memoized.identify({ croppedImage: null });
    await memoized.identify({ croppedImage: null });

    expect(calls).toHaveLength(2);
  });

  it("does not poison the cache after a rejected identify call", async () => {
    let attempt = 0;
    const strategy: IdentificationStrategy = {
      id: "flaky",
      async identify(): Promise<IdentificationOutput> {
        attempt += 1;
        if (attempt === 1) throw new Error("boom");
        return { status: "identified", identificationConfidence: 1, candidates: [], error: null };
      },
    };
    const memoized = createMemoizedIdentificationStrategy(strategy);

    await expect(memoized.identify({ croppedImage: image })).rejects.toThrow("boom");
    const result = await memoized.identify({ croppedImage: image });

    expect(attempt).toBe(2);
    expect(result.status).toBe("identified");
  });

  it("exposes an id that references the wrapped strategy", () => {
    const { strategy } = fakeStrategy();
    const memoized = createMemoizedIdentificationStrategy(strategy);
    expect(memoized.id).toBe("memoized(fake)");
  });
});
