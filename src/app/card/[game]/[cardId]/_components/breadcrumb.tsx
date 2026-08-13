import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function CardBreadcrumb({
  gameId,
  gameName,
  setId,
  setName,
  cardName,
}: {
  gameId: string;
  gameName: string;
  setId: string;
  setName: string;
  cardName: string;
}) {
  return (
    <nav className="mb-3 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
      <Link href={`/sets/${gameId}`} className="hover:text-foreground">
        {gameName}
      </Link>
      <ChevronRight className="size-3.5" />
      <Link href={`/explore?game=${gameId}&set=${encodeURIComponent(setId)}`} className="hover:text-foreground">
        {setName}
      </Link>
      <ChevronRight className="size-3.5" />
      <span className="text-foreground">{cardName}</span>
    </nav>
  );
}
