/**
 * Riftbound's printed card-numbering convention (e.g. "SFD • 004/221"), per
 * riftboundsymbols.com and confirmed against live `riftbound_id` values from
 * api.riftcodex.com. The id already encodes the exact suffix the card is
 * printed with — no separate flag-based formatting is needed:
 *
 *   "sfd-004-221"  -> "004/221"   (standard, and also overnumber — a number
 *                                  higher than the set total prints with no
 *                                  extra marking, e.g. "sfd-224-221")
 *   "sfd-026a-221" -> "026a/221"  (alternate art — "a"/"b"/... suffix)
 *   "sfd-224*-221" -> "224*" + "/221" (signature overnumber — asterisk suffix)
 *
 * Riftbound also documents Token ("T03") and Rune ("R01") ids outside the
 * main set numbering, not part of the "<number>-<total>" shape above and
 * not seen in any live set's `riftbound_id` data yet — for any id that
 * doesn't match the standard shape, this falls back to the raw middle
 * segment (uppercased) so display degrades to *something* legible instead
 * of null.
 */
export function parseRiftboundNumber(riftboundId: string): string | undefined {
  const match = /^[a-z0-9]+-(\d+[a-z*]?)-(\d+)$/i.exec(riftboundId);
  if (match) return `${match[1]}/${match[2]}`;

  const parts = riftboundId.split("-");
  return parts.length >= 2 ? parts[1].toUpperCase() : undefined;
}
