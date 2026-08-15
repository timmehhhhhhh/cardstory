/**
 * Formats a release date (stored as midnight-UTC, either an ISO "YYYY-MM-DD"
 * string from CatalogSearchItem or a raw Date from a Prisma row) into
 * "March 31, 2023" for display. UTC is used explicitly so the calendar day
 * shown always matches the stored date, regardless of the viewer's timezone.
 */
export function formatReleaseDate(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}
