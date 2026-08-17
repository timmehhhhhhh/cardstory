/**
 * Resolves what Holding.priceAtAcquisition should be for a card being
 * added right now with a given `acquiredAt` date — shared by
 * AddHoldingDialog and AddSportsCardDialog so the "today vs backdated"
 * branch (and its endpoint call) lives in exactly one place.
 *
 * When `date` is today, the caller already has the live price in hand
 * (`liveSuggestedPrice` — CatalogItem/SportsCardItem.latestPriceRaw fetched
 * server-side and passed down as a prop), so no network call is made. When
 * `date` is backdated, this fetches the nearest snapshot on/before that
 * date via /api/pricing/at-date. Best-effort: a failed fetch resolves to
 * null rather than blocking the add.
 */
export async function resolvePriceAtDate({
  date,
  liveSuggestedPrice,
  catalogItemId,
  sportsCardItemId,
}: {
  /** "YYYY-MM-DD", the value the "Acquired on" field holds. */
  date: string;
  liveSuggestedPrice: number | null;
  catalogItemId?: string;
  sportsCardItemId?: string;
}): Promise<number | null> {
  const today = new Date().toISOString().slice(0, 10);
  if (date === today) return liveSuggestedPrice ?? null;
  if (!catalogItemId && !sportsCardItemId) return null;

  const params = new URLSearchParams({ date });
  if (sportsCardItemId) params.set("sportsCardItemId", sportsCardItemId);
  else if (catalogItemId) params.set("catalogItemId", catalogItemId);

  try {
    const res = await fetch(`/api/pricing/at-date?${params}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { priceRaw: number | null };
    return data.priceRaw ?? null;
  } catch {
    return null;
  }
}
