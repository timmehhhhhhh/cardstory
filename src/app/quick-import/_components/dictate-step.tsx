"use client";

import * as React from "react";
import { ArrowLeft, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSpeechDictation } from "@/hooks/use-speech-dictation";
import { getGameMeta } from "@/lib/games/registry";

/**
 * The core Quick Import loop's dictation screen: a big mic button feeding an
 * editable text field, same "never trust raw transcript blindly" pairing as
 * MobileSearchSheet (src/components/nav/mobile-search-sheet.tsx) — the
 * recognized (possibly mangled) text populates the field live but the user
 * always confirms/corrects it before submitting, since there's no
 * cross-browser way to bias recognition toward real set names. Browsers
 * without SpeechRecognition (dictation.supported === false) just get the
 * text field — same graceful fallback as MobileSearchSheet.
 */
export function DictateStep({
  gameId,
  setsLoading,
  error,
  onSubmit,
  onChangeGame,
}: {
  gameId: string;
  setsLoading: boolean;
  error: string | null;
  onSubmit: (raw: string) => void;
  onChangeGame: () => void;
}) {
  const [value, setValue] = React.useState("");
  const dictation = useSpeechDictation();
  const gameName = getGameMeta(gameId)?.name ?? gameId;

  React.useEffect(() => {
    if (!dictation.listening && !dictation.transcript) return;
    const t = setTimeout(() => setValue(dictation.transcript), 0);
    return () => clearTimeout(t);
  }, [dictation.transcript, dictation.listening]);

  function submit() {
    dictation.stop();
    const trimmed = value.trim();
    if (trimmed) onSubmit(trimmed);
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 px-4 py-8">
      <button
        type="button"
        onClick={onChangeGame}
        className="flex items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {gameName}
      </button>

      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <p className="text-sm text-muted-foreground">
          Say the set name and the card&apos;s number in that set — e.g. &quot;fossil 45&quot; or
          &quot;wizards black star promo 1&quot;.
        </p>
        {dictation.supported && (
          <button
            type="button"
            aria-label={dictation.listening ? "Stop dictation" : "Start dictation"}
            aria-pressed={dictation.listening}
            onClick={() => (dictation.listening ? dictation.stop() : dictation.start())}
            className={cn(
              "flex size-20 items-center justify-center rounded-full border-2 transition-colors",
              dictation.listening
                ? "animate-pulse border-primary bg-primary/10 text-primary"
                : "border-border bg-surface text-muted-foreground hover:text-foreground"
            )}
          >
            <Mic className="size-8" />
          </button>
        )}
        {dictation.listening && (
          <p className="text-xs text-primary">Listening… tap the mic again to stop.</p>
        )}
      </div>

      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
        placeholder={dictation.supported ? "Or type it here…" : 'e.g. "fossil 45"'}
        className="h-11 text-center"
        autoFocus={!dictation.supported}
      />

      {error && <p className="text-center text-sm text-negative">{error}</p>}

      <Button onClick={submit} disabled={!value.trim() || setsLoading} className="h-11">
        {setsLoading ? "Loading sets…" : "Find card"}
      </Button>
    </div>
  );
}
