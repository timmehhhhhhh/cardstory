# CardVision

CardVision is CardStory's specialised Pokémon trading-card image-recognition architecture: a provider-agnostic **retrieval** system (vision embeddings + vector search + OCR + multi-signal candidate ranking), as opposed to a single giant classifier or "ask an LLM and trust the answer." This document describes what exists today (Phase 1: architecture foundation; Phase 2: reference-image indexing) and what's planned.

## Why CardVision exists

CardStory already has a working recognition path — [`src/lib/scanning/`](../src/lib/scanning/index.ts) — used by the Mass Card Scanner and Binder Import. Its only `IdentificationStrategy` today, `claude-visual-text` ([`src/lib/scanning/identify/claude-identification.ts`](../src/lib/scanning/identify/claude-identification.ts)), asks Claude's vision API to read a card once, then fuzzy-matches the reading against the catalog. That works, but it's fundamentally "one model's best guess" — it doesn't combine independent signals (what the card *looks like* vs. what its *text* says vs. what its *metadata* implies), and it can't improve from real usage without retraining a prompt.

CardVision is the architecture for a different approach: retrieve candidate cards using multiple independent signals, then rank them with explicit, inspectable scoring — never assuming the first answer is correct, always preserving multiple candidates, and always keeping a path for a human to confirm before anything is written to a collection.

**CardVision does not replace `src/lib/scanning` today.** It's a second, currently-unused module (`src/lib/cardvision/`) that can eventually plug into the exact same pipeline as another `IdentificationStrategy` (see [Providers](#providers-recognition-signals) below) — Scan and Binder Import are completely unaffected by this phase.

## The recognition pipeline

```
USER IMAGE
  ↓
CARD DETECTION            — reused: src/lib/scanning/detectors (CardDetector)
  ↓
INDIVIDUAL CARD CROPS     — reused: src/lib/scanning/image-processing (ImageProcessor)
  ↓
IMAGE NORMALISATION       — CardVision addition: ImageValidator (Phase 1: pass-through stub)
  ↓
VISION EMBEDDING MODEL    — CardVision: VisionEmbeddingProvider (Phase 1: null-embedding-provider, always returns null)
  ↓
VECTOR SEARCH             — CardVision: CandidateRetriever (Phase 1: catalog-text-retriever, text-only via the catalog)
  ↓
TOP CARD CANDIDATES       — CardVision: RecognitionCandidate[]
  ↓
OCR / COLLECTOR NUMBER    — CardVision: OCRProvider (Phase 1: noop-ocr-provider, always empty)
  ↓
CANDIDATE RANKING         — CardVision: CandidateRanker (Phase 1: deterministic-candidate-ranker, fixed-weight scaffold)
  ↓
EXACT CARD IDENTIFICATION — a human/reviewer confirms; CardVision never auto-selects
  ↓
CARDSTORY CARD ID          — CatalogItem.id, the existing catalog — never a second database
  ↓
COLLECTION / BINDER IMPORT — unchanged; still src/lib/pc and src/lib/binder-import
```

Every stage above the "CARD DETECTION" line reuses `src/lib/scanning`'s existing implementations rather than duplicating them — `src/lib/cardvision/pipeline/types.ts`'s `buildCardVisionPipelineDefaults()` wires directly to `getDefaultCardDetector()` and `serverImageProcessor`.

## Providers (recognition signals)

Four interfaces (`src/lib/cardvision/providers/types.ts`), each independently swappable and each carrying an `id` for logging/telemetry:

| Interface | Job | Phase 1 implementation |
|---|---|---|
| `VisionEmbeddingProvider` | `embed(image)` → a vector, or `null` if none available | `null-embedding-provider.ts` — always `null` |
| `OCRProvider` | `read(image)` → name/collector number/set text | `noop-ocr-provider.ts` — always empty |
| `CandidateRetriever` | given embedding + OCR text, find candidate `CatalogItem`s | `catalog-text-retriever.ts` — the one real piece; reuses `src/lib/scanning/identify/rank-candidates.ts`'s existing Fuse.js catalog search |
| `CandidateRanker` | combine each candidate's per-signal scores into one overall score | `deterministic-candidate-ranker.ts` — fixed weights (visual 50% / OCR 35% / metadata 15%), rescored proportionally over whichever signals are actually present |

`src/lib/cardvision/recognizer.ts`'s `createCardVisionRecognizer()` composes all four (each independently overridable) behind one `CardVisionRecognizer.recognize()` call. Swapping any one provider for a real implementation later never requires touching the other three or `recognizer.ts` itself.

## The recognition result

`RecognitionResult` (`src/lib/cardvision/types.ts`) is deliberately structured, not plain text — it always carries:

- `status` (`pending`/`recognized`/`needs_review`/`unidentified`/`error`) and `confidenceLevel` (`HIGH_CONFIDENCE`/`NEEDS_REVIEW`/`LOW_CONFIDENCE`/`UNIDENTIFIED`/`ERROR`) — two separate axes: "what happened" vs. "how much to trust it."
- `candidates: RecognitionCandidate[]` — ranked, each with its own `visualSimilarity`/`ocrScore`/`metadataScore`/`score` breakdown (nullable per-signal until a real provider exists for that signal).
- `cardId` — **always `null` until a human (or a future auto-import policy) confirms one.** CardVision never assumes `candidates[0]` is correct.
- `ocr` — the raw OCR reading, kept for review UI and telemetry even after candidate extraction.
- `position: CardPosition` — see below.
- `metadata` — which provider set produced this, and processing time.

### Confidence states and intended behavior

`src/lib/cardvision/confidence.ts`'s `classifyRecognitionConfidence()` is deterministic and threshold-based (named constants, unit-tested boundaries) — no ML here yet. The intended (not-yet-enforced) business behavior each level implies:

- **HIGH_CONFIDENCE** → could potentially auto-import
- **NEEDS_REVIEW** → present candidate(s) for confirmation
- **LOW_CONFIDENCE** → require the user to identify the card manually
- **UNIDENTIFIED** → no trustworthy candidate at all
- **ERROR** → recognition itself failed

## Spatial position (for Binder Planner)

`CardPosition` (`src/lib/cardvision/types.ts`) carries `imageId`, `index`, `row`, `column`, `page`, and `boundingBox` through every `RecognitionResult` — required so a future Binder Planner import can map a recognized card back to an exact virtual binder pocket. CardVision **carries** this position; it does not compute the row/column/page mapping itself — that's already the Binder Import feature's job (`src/lib/scanning/geometry.ts`'s `mapCardsToGrid`, driving `src/lib/binder-import/session-state.ts`'s `buildPagePlacements`). `row`/`column`/`page` are nullable specifically so a caller that hasn't computed a grid mapping yet (e.g. plain Mass Scanner usage) can still supply a position.

`MultiCardRecognitionResult` wraps `RecognitionResult[]` from one photo, supporting single-card photos, multi-card photos, and binder-page photos identically — `recognizeMany()` on `CardVisionRecognizer`.

## Reference indexing

`src/lib/cardvision/reference-index.ts`'s `CardReferenceIndexer` is CardVision's real, persistent library of downloaded reference-card images (Phase 2). It does not generate embeddings — see "Vision embeddings (Phase 3)" below.

**The CardStory catalog (`CatalogItem` in `prisma/schema.prisma`) remains the sole source of truth.** `CardReferenceRecord.catalogItemId` is always an existing `CatalogItem.id` (`"<gameId>:<externalId>"`) — CardVision never creates a second card database. `catalogReferenceIndexer.rebuildIndex()` sources indexable cards straight from `CatalogItem` rows that have a non-null `imageSmallUrl` and/or `imageLargeUrl`, the same narrow-query style as `src/lib/catalog/images.ts`'s `applyCatalogImagePatches`. Nothing in the indexer reads a game-specific `CatalogItem` field — it works the same for Pokémon, MTG, sports cards, or any future game.

Reference images live on external CDNs (pokemontcg.io / tcgdex), and this app has no R2/object-storage binding and no writable local filesystem at Cloudflare Workers runtime — so `rebuildIndex()` downloads each image and caches it in Postgres (`CardReferenceImage` / `CardReferenceImageLink` in `prisma/schema.prisma`) rather than a local cache directory, using the app's existing persistence instead of new infrastructure. `imageLargeUrl` is preferred over `imageSmallUrl`, with a same-run fallback to `imageSmallUrl` if the large URL fails. Images are cached by content hash, so CatalogItems sharing an identical source URL (or identical bytes) are fetched once and stored once. Repeat runs are incremental: unchanged items are cache hits (no re-fetch), a changed image URL triggers a re-fetch, and cache links for CatalogItems that are gone or have lost their image URL are swept. `getCachedReferenceImage(catalogItemId)` is the seam a real `VisionEmbeddingProvider` (Phase 3, below) reads cached bytes through.

Run via `npm run reindex:cardvision` (optionally `-- --game=<gameId>` / `--since=<ISO date>`), see `scripts/reindex-cardvision-references.ts`. Nothing in the deployed app calls `rebuildIndex()` automatically yet — that's a natural, low-risk Phase 2.5-style follow-up (a cron route mirroring `src/app/api/cron/snapshot-prices/route.ts`), not part of this phase.

## Vision embeddings & retrieval (Phase 3)

Phase 3 adds the first real `VisionEmbeddingProvider` and the first real (non-text) `CandidateRetriever`, plus the persistence and evaluation infrastructure between them — without hard-coding a vendor into the CardVision domain layer or any game-specific assumption into the embedding path.

**Provider**: `src/lib/cardvision/providers/voyage-embedding-provider.ts`'s `createVoyageEmbeddingProvider()` calls Voyage AI's `voyage-multimodal-3.5` multimodal embeddings API via raw `fetch` (no SDK — same rationale as `src/lib/scan/ai-provider.ts`'s direct Anthropic calls: this app deploys under a 3 MiB Cloudflare Workers bundle cap). It is one implementation of the same `VisionEmbeddingProvider` interface `null-embedding-provider.ts` implements — nothing downstream (persistence, retrieval, `recognizer.ts`) is coupled to Voyage specifically. `embed()` returns `null` only when unconfigured (no `VOYAGE_API_KEY`); an actual failure (network, auth, rate limit, malformed response) throws a classified `EmbeddingProviderError` (`providers/embedding-error.ts`) instead, so bulk generation can record *why* an item failed.

`embed(image, role)` takes an `EmbeddingRole` (`"document"` for reference images being indexed, `"query"` for a scan being recognized) — Voyage's `input_type`, since its encoder treats indexed content and search queries asymmetrically. `EmbeddingVector.model` is always set to the producing provider's own deterministic `id` (e.g. `"cardvision-voyage-voyage-multimodal-3.5"`), so persistence and retrieval never need a second identity to keep in sync.

**Persistence**: `CardReferenceEmbedding` (`prisma/schema.prisma`) stores one Float32-packed vector (`providers/embedding-codec.ts`) per `(catalogItemId, variantKey, provider)`, with `dims`, `status` (`"ready"`/`"failed"`), an `error` message, and timestamps. The `provider` column is part of the unique key specifically so re-embedding with a new/upgraded model creates a new row instead of destroying the previous model's — provenance survives a model swap.

**Generation**: `src/lib/cardvision/embedding-index.ts`'s `CardEmbeddingIndexer` (mirrors `reference-index.ts`'s shape) sources candidates from `catalogReferenceIndexer.listIndexableCards()` and reads bytes exclusively through `catalogReferenceIndexer.getCachedReferenceImage(catalogItemId)` — no second image-storage path. Run via `npm run embed:cardvision` (same `--game=`/`--since=`/`--limit=` flags as `reindex:cardvision`) after `reindex:cardvision` has cached the images to embed.

**Retrieval**: `src/lib/cardvision/providers/embedding-similarity-retriever.ts`'s `embeddingSimilarityRetriever` is a `CandidateRetriever` that brute-force compares a query embedding against every `status: "ready"` `CardReferenceEmbedding` sharing the same `provider` (never across models), via cosine similarity — deliberately the simplest correct implementation, no pgvector/ANN index, no re-ranking. Embedding-only, the same shape as `catalog-text-retriever.ts` being OCR-only; a future hybrid retriever combining both is a separate implementation.

**Evaluation**: `src/lib/cardvision/eval/evaluate-retrieval.ts`'s `evaluateRetrieval()` is the measurable seam requirement #9 of this phase's brief asked for — given fixture cases (`{expectedCatalogItemId, queryImage}`), it reports top-1/5/10 accuracy and the raw top-candidate similarity distribution. It only computes numbers; it never itself claims the system "works."

**Opt-in wiring**: everything above is inert until `CARDVISION_PROVIDER=voyage-embedding` (see `.env.example`) — `config.ts`'s `getDefaultCardVisionRecognizer()` then composes `{embeddingProvider: createVoyageEmbeddingProvider(), retriever: embeddingSimilarityRetriever}` instead of the scaffold pair. The default (`"scaffold"`) provider set, and Scan/Binder Import, are completely unaffected.

## Telemetry (future training loop)

`src/lib/cardvision/telemetry.ts`'s `RecognitionTelemetryRecorder` interface exists so a future confirmation flow can record `RecognitionAttempt`s — provider, predicted candidate, OCR output, processing time, and (once available) the user's actual correction — enabling:

```
REAL CARD PHOTOS → CARDVISION PREDICTION → USER CORRECTION → VERIFIED TRAINING EXAMPLE → FUTURE MODEL IMPROVEMENT
```

**No Prisma model is added in this phase.** This repo only adds a table once a real writer needs it (see `ActivityLog`/`src/lib/activity/log.ts`'s precedent) — a `CardVisionRecognitionLog` model is explicit Phase 7 work. Phase 1 ships two recorders: `noopTelemetryRecorder` (discards everything, the default) and `consoleTelemetryRecorder` (dev-only console logging, gated by `CARDVISION_DEBUG`). Neither ever records raw image bytes — only `{ kind, mimeType }` metadata, consistent with this app's existing policy of never persisting user photos.

## Enabling / disabling CardVision

CardVision is off by default and has zero effect on the app until explicitly enabled. Environment variables (see `.env.example`), read via `src/lib/cardvision/config.ts`:

- `CARDVISION_ENABLED` — `"true"` to enable; anything else (including unset) is off.
- `CARDVISION_PROVIDER` — which provider set to use; defaults to `"scaffold"` (Phase 1's no-op providers).
- `CARDVISION_DEBUG` — `"true"` to log recognition attempts to the console.

`getDefaultCardVisionRecognizer()` returns `null` when disabled, so a future integration's fallback logic is a one-line check. Scan and Binder Import do not call into `src/lib/cardvision` at all today — enabling these flags has no visible effect yet.

## Becoming a scanning-engine provider

`src/lib/cardvision/identification-strategy-adapter.ts`'s `toIdentificationStrategy(recognizer)` wraps any `CardVisionRecognizer` into the scanning engine's existing `IdentificationStrategy` interface, so a future integration is:

```ts
runScanPipeline({ identificationStrategy: toIdentificationStrategy(createCardVisionRecognizer()) })
```

with zero changes to the Mass Card Scanner or Binder Import UI/routes. This proves the "swap recognition providers without touching scanning/import features" requirement without actually switching production behavior in this phase — `claude-visual-text` stays the default.

## Future CardVision Implementation

- **Phase 1 — Architecture** ✅ — provider-agnostic interfaces, structured recognition results, candidate ranking scaffold, reference-index and telemetry abstractions, spatial-position preservation, feature flags. No model training, no embeddings, no vector database.
- **Phase 2 — Reference-card image indexing** ✅ *(this change)* — a real `CardReferenceIndexer` (`src/lib/cardvision/reference-index.ts`) that downloads, hashes, and caches CatalogItem reference images in Postgres, incrementally and idempotently. Still no embeddings, no vector database, no ML dependency — see "Reference indexing" above.
- **Phase 3 — Vision embedding & retrieval foundation** ✅ *(this change)* — a real `VisionEmbeddingProvider` (`voyage-embedding-provider.ts`, Voyage AI's `voyage-multimodal-3.5`), `CardReferenceEmbedding` persistence with model provenance, a brute-force cosine-similarity `CandidateRetriever` (`embedding-similarity-retriever.ts`), and a measurable evaluation seam (`eval/evaluate-retrieval.ts`) — see "Vision embeddings & retrieval (Phase 3)" above. Still no pgvector/ANN index and no re-ranking; opt-in via `CARDVISION_PROVIDER=voyage-embedding`, off by default.
- **Phase 4** — Specialised card detection: a purpose-built `CardDetector`/`ImageProcessor` (real cropping, perspective correction) beyond today's Claude-vision-based detector and pass-through crop.
- **Phase 5** — OCR / collector-number recognition: a real `OCRProvider`.
- **Phase 6** — Candidate ranking: replacing the deterministic scaffold with a tuned or learned `CandidateRanker`.
- **Phase 7** — Real-world training/feedback dataset: a persisted `RecognitionTelemetryRecorder` (the deferred `CardVisionRecognitionLog` model) capturing user corrections.
- **Phase 8** — Fine-tuning CardVision using real CardStory scans, using the Phase 7 dataset.
