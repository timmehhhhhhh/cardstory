"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { languageLabel } from "@/lib/format/language";
import { SetTile } from "@/app/sets/[game]/_components/set-tile";

interface SetTileData {
  id: string;
  setId: string;
  name: string;
  nameEn: string | null;
  code: string | null;
  cardCount: number;
  symbolUrl: string | null;
  logoUrl: string | null;
  releaseDate: string | null;
  language: string;
}

/**
 * Horizontal, browser-tab-style switcher between a game's Sets languages —
 * replaces the old stacked "English (174 sets)" / "Japanese (185 sets)"
 * sections (which required scrolling past one language to reach the next)
 * with a single tab strip. All languages' sets are already loaded by
 * GameSetsPage in one query, so switching tabs is a pure client-side
 * selection — no refetch needed.
 *
 * Selection persists to `?lang=` the same way SortControls persists
 * sort/group state, so a link to e.g. Japanese sets is shareable/bookmarkable
 * (`sets/[game]/_components/sort-controls.tsx` for the sibling convention).
 */
export function LanguageTabs({
  gameId,
  groups,
}: {
  gameId: string;
  groups: { language: string; sets: SetTileData[] }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const requested = searchParams.get("lang");
  // compareLanguage (page.tsx) already sorts English first, so groups[0] is
  // the sensible default when `lang` is absent or points at a language this
  // game doesn't have any sets in.
  const active = groups.some((g) => g.language === requested) ? requested! : (groups[0]?.language ?? "");

  function onValueChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    // English is first/default — keep the URL clean when it's selected.
    if (value === groups[0]?.language) params.delete("lang");
    else params.set("lang", value);
    const query = params.toString();
    router.push(query ? `?${query}` : "?", { scroll: false });
  }

  if (groups.length === 0) return null;

  return (
    <Tabs value={active} onValueChange={onValueChange}>
      <TabsList variant="line" className="mb-4 h-auto flex-wrap justify-start gap-1">
        {groups.map((g) => (
          <TabsTrigger key={g.language} value={g.language} className="px-2.5 py-1.5">
            {languageLabel(g.language)}{" "}
            <span className="font-normal text-muted-foreground">
              ({g.sets.length} set{g.sets.length === 1 ? "" : "s"})
            </span>
          </TabsTrigger>
        ))}
      </TabsList>
      {groups.map((g) => (
        <TabsContent key={g.language} value={g.language}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {g.sets.map((s) => (
              <SetTile
                key={s.id}
                gameId={gameId}
                setId={s.setId}
                name={s.name}
                nameEn={s.nameEn}
                code={s.code}
                cardCount={s.cardCount}
                symbolUrl={s.symbolUrl}
                logoUrl={s.logoUrl}
                releaseDate={s.releaseDate}
              />
            ))}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}
