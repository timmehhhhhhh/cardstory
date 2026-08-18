import Link from "next/link";

/**
 * The "no holdings match" state, shared by every way of rendering a pc's
 * items (ItemGrid's rows, ItemGallery's tiles). Lives outside both so
 * switching view mode never changes what an empty collection says.
 */
export function EmptyHoldings() {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border py-16 text-center">
      <p className="font-medium">Nothing here yet</p>
      <p className="text-sm text-muted-foreground">
        Head to <Link href="/explore" className="text-primary hover:underline">Explore</Link> and add a
        card, or use &quot;Add Sports Card&quot; above.
      </p>
    </div>
  );
}
