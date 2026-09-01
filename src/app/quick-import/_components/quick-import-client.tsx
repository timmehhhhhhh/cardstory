"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { GameSelectStep } from "@/app/quick-import/_components/game-select-step";
import { DictateStep } from "@/app/quick-import/_components/dictate-step";
import { SetPickerStep } from "@/app/quick-import/_components/set-picker-step";
import { ResultsStep } from "@/app/quick-import/_components/results-step";
import { isConfidentMatch, rankSetCandidates, type SetMatchCandidate } from "@/lib/quick-import/match-set";
import { normalizeSpokenNumbers } from "@/lib/quick-import/normalize-spoken-numbers";
import { parseNameNumberQuery } from "@/lib/utils/name-match";
import type { QuickImportSetOption } from "@/app/api/quick-import/sets/route";

type Step = "select-game" | "dictate" | "set-picker" | "results";

/**
 * Quick Import: a hands-free alternative to Explore's search for bulk card
 * entry. The loop is game -> dictate "<set name> <number>" -> (maybe
 * disambiguate the set) -> tap the exact card off a results grid -> Next
 * Card, back to dictate, same game. One client component holding a `Step`
 * state machine — same pattern as ScanClient
 * (src/app/scan/_components/scan-client.tsx) — rather than separate routes
 * per step, so "Next Card" is just a state reset with no navigation/reload.
 */
export function QuickImportClient() {
  const [step, setStep] = React.useState<Step>("select-game");
  const [gameId, setGameId] = React.useState<string | null>(null);
  const [numberPart, setNumberPart] = React.useState<string | null>(null);
  const [candidates, setCandidates] = React.useState<SetMatchCandidate[]>([]);
  const [selectedSet, setSelectedSet] = React.useState<{ id: string; name: string } | null>(null);
  const [dictateError, setDictateError] = React.useState<string | null>(null);

  // Fetched once per game (small list, long client cache) — see
  // /api/quick-import/sets. Kept mounted across the dictate/set-picker/
  // results steps so re-dictating for Next Card doesn't refetch.
  const setsQuery = useQuery<{ sets: QuickImportSetOption[] }>({
    queryKey: ["quick-import-sets", gameId],
    queryFn: async () => {
      const res = await fetch(`/api/quick-import/sets?gameId=${encodeURIComponent(gameId!)}`);
      if (!res.ok) throw new Error("Failed to load sets");
      return res.json();
    },
    enabled: gameId != null,
    staleTime: 60 * 60 * 1000,
  });

  function handleGamePicked(id: string) {
    setGameId(id);
    setStep("dictate");
  }

  function handleChangeGame() {
    setGameId(null);
    setSelectedSet(null);
    setNumberPart(null);
    setCandidates([]);
    setDictateError(null);
    setStep("select-game");
  }

  function handleDictateSubmit(raw: string) {
    setDictateError(null);
    const { namePart, numberPart: parsedNumber } = parseNameNumberQuery(normalizeSpokenNumbers(raw));
    if (!parsedNumber) {
      setDictateError('Say (or type) a set name and the card’s number, e.g. "fossil 45".');
      return;
    }
    const sets = setsQuery.data?.sets ?? [];
    const ranked = rankSetCandidates(namePart, sets);
    if (ranked.length === 0) {
      setDictateError(`No sets matched "${namePart}" for this game — try again.`);
      return;
    }
    setNumberPart(parsedNumber);
    if (isConfidentMatch(ranked)) {
      setSelectedSet({ id: ranked[0].id, name: ranked[0].name });
      setStep("results");
    } else {
      setCandidates(ranked.slice(0, 5));
      setStep("set-picker");
    }
  }

  function handleSetPicked(set: { id: string; name: string }) {
    setSelectedSet(set);
    setStep("results");
  }

  function handleNextCard() {
    setSelectedSet(null);
    setNumberPart(null);
    setCandidates([]);
    setDictateError(null);
    setStep("dictate");
  }

  if (step === "select-game") {
    return <GameSelectStep onPick={handleGamePicked} />;
  }

  if (step === "dictate") {
    return (
      <DictateStep
        gameId={gameId!}
        setsLoading={setsQuery.isLoading}
        error={dictateError}
        onSubmit={handleDictateSubmit}
        onChangeGame={handleChangeGame}
      />
    );
  }

  if (step === "set-picker") {
    return <SetPickerStep candidates={candidates} onPick={handleSetPicked} onBack={() => setStep("dictate")} />;
  }

  return (
    <ResultsStep gameId={gameId!} set={selectedSet!} numberPart={numberPart!} onNextCard={handleNextCard} />
  );
}
