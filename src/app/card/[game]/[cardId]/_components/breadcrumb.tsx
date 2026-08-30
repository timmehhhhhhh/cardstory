import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { withEnglishName } from "@/lib/catalog/card-name";

export function CardBreadcrumb({
  gameId,
  gameName,
  setId,
  setName,
  setNameEn,
  cardName,
}: {
  gameId: string;
  gameName: string;
  setId: string;
  setName: string;
  setNameEn?: string | null;
  cardName: string;
}) {
  return (
    <nav className="mb-3 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
      <Link href={`/sets/${gameId}`} className="hover:text-foreground">
        {gameName}
      </Link>
      <ChevronRight className="size-3.5" />
      <Link href={`/explore?game=${gameId}&set=${encodeURIComponent(setId)}`} className="hover:text-foreground">
        {withEnglishName(setName, setNameEn)}
      </Link>
      <ChevronRight className="size-3.5" />
      <span className="text-foreground">{cardName}</span>
    </nav>
  );
}
