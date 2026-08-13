"use client";

import * as React from "react";
import { Loader2, PlusCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePortfolioStore } from "@/lib/portfolio/store";
import { SPORTS } from "@/lib/sports/registry";
import { formatMoney } from "@/lib/utils/format";
import type { CardCondition, ItemLanguage } from "@/lib/portfolio/types";

type Sport = "NBA" | "F1" | "UFC" | "TENNIS";

interface SearchCandidate {
  id: string;
  name: string;
  consoleName: string;
}

export function AddSportsCardDialog() {
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  // Search state
  const [sport, setSport] = React.useState<Sport>("NBA");
  const [query, setQuery] = React.useState("");
  const [searching, setSearching] = React.useState(false);
  const [searchUnavailable, setSearchUnavailable] = React.useState(false);
  const [candidates, setCandidates] = React.useState<SearchCandidate[]>([]);
  const [matchedPriceChartingId, setMatchedPriceChartingId] = React.useState<string | null>(null);
  const [matchedPrice, setMatchedPrice] = React.useState<number | null>(null);

  // Form state (prefillable from a search match, always editable)
  const [year, setYear] = React.useState("");
  const [setName, setSetName] = React.useState("");
  const [playerName, setPlayerName] = React.useState("");
  const [teamName, setTeamName] = React.useState("");
  const [cardNumber, setCardNumber] = React.useState("");
  const [parallelName, setParallelName] = React.useState("");
  const [isAutograph, setIsAutograph] = React.useState(false);
  const [isRelic, setIsRelic] = React.useState(false);
  const [serialNumber, setSerialNumber] = React.useState("");
  const [serialLimit, setSerialLimit] = React.useState("");

  const [quantity, setQuantity] = React.useState(1);
  const [condition, setCondition] = React.useState<CardCondition>("raw");
  const [gradeCompany, setGradeCompany] = React.useState("PSA");
  const [gradeValue, setGradeValue] = React.useState("10");
  const [costBasis, setCostBasis] = React.useState("");
  const [acquiredAt, setAcquiredAt] = React.useState(() => new Date().toISOString().slice(0, 10));

  const portfolios = usePortfolioStore((s) => s.portfolios);
  const activePortfolioId = usePortfolioStore((s) => s.activePortfolioId);
  const [portfolioId, setPortfolioId] = React.useState(activePortfolioId);
  const addHolding = usePortfolioStore((s) => s.addHolding);

  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setPortfolioId(activePortfolioId);
  }

  async function handleSearch() {
    if (!query.trim()) return;
    setSearching(true);
    setCandidates([]);
    try {
      const res = await fetch(`/api/sportscards/search?sport=${sport}&q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (!data.available) setSearchUnavailable(true);
      else setCandidates(data.candidates);
    } finally {
      setSearching(false);
    }
  }

  async function handlePickCandidate(candidate: SearchCandidate) {
    setSearching(true);
    try {
      const res = await fetch(`/api/sportscards/product/${candidate.id}`);
      const data = await res.json();
      if (!data.found) return;
      setMatchedPriceChartingId(data.priceChartingId);
      setMatchedPrice(data.values?.loosePrice ?? null);
      if (data.suggested.playerName) setPlayerName(data.suggested.playerName);
      if (data.suggested.cardNumber) setCardNumber(data.suggested.cardNumber);
      if (data.suggested.parallelName) setParallelName(data.suggested.parallelName);
      if (data.suggested.year) setYear(String(data.suggested.year));
      if (data.suggested.setName) setSetName(data.suggested.setName);
      if (data.values?.loosePrice != null) setCostBasis(data.values.loosePrice.toFixed(2));
      setCandidates([]);
    } finally {
      setSearching(false);
    }
  }

  function resetForm() {
    setQuery("");
    setCandidates([]);
    setMatchedPriceChartingId(null);
    setMatchedPrice(null);
    setYear("");
    setSetName("");
    setPlayerName("");
    setTeamName("");
    setCardNumber("");
    setParallelName("");
    setIsAutograph(false);
    setIsRelic(false);
    setSerialNumber("");
    setSerialLimit("");
    setQuantity(1);
    setCondition("raw");
    setCostBasis("");
  }

  async function handleAdd() {
    if (!setName.trim() || !playerName.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/sportscards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceChartingId: matchedPriceChartingId ?? undefined,
          sport,
          year: year ? Number(year) : undefined,
          setName: setName.trim(),
          playerName: playerName.trim(),
          teamName: teamName.trim() || undefined,
          cardNumber: cardNumber.trim() || undefined,
          parallelName: parallelName.trim() || undefined,
          isAutograph,
          isRelic,
          serialLimit: serialLimit.trim() || undefined,
        }),
      });
      if (!res.ok) return;
      const { id: sportsCardItemId } = await res.json();

      addHolding(portfolioId, {
        kind: "sports",
        sportsCardItemId,
        quantity: Math.max(1, quantity),
        condition,
        gradeCompany: condition === "graded" ? gradeCompany : undefined,
        gradeValue: condition === "graded" ? gradeValue : undefined,
        serialNumber: serialNumber.trim() || undefined,
        language: "EN" as ItemLanguage,
        costBasisTotal: Number(costBasis) || 0,
        costBasisCurrency: "USD",
        acquiredAt: new Date(acquiredAt).toISOString(),
      });

      resetForm();
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
        >
          <PlusCircle className="size-4" /> Add Sports Card
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-surface border-border sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a sports card</DialogTitle>
          <DialogDescription>
            Search SportsCardsPro to auto-fill the exact parallel and a real price, or enter everything
            manually below.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>Sport</Label>
            <Select value={sport} onValueChange={(v) => setSport(v as Sport)}>
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SPORTS.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="sc-search">Search (player, set, year…)</Label>
            <div className="flex gap-2">
              <Input
                id="sc-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleSearch())}
                placeholder="e.g. Luka Doncic 2023 Prizm"
                className="bg-background"
              />
              <Button type="button" variant="outline" onClick={handleSearch} disabled={searching}>
                {searching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
              </Button>
            </div>
            {searchUnavailable && (
              <p className="text-xs text-muted-foreground">
                Not configured — no <code className="rounded bg-surface-elevated px-1 py-0.5">SPORTSCARDSPRO_API_KEY</code>{" "}
                (or <code className="rounded bg-surface-elevated px-1 py-0.5">PRICECHARTING_API_KEY</code>) set. You
                can still add this card manually below.
              </p>
            )}
            {candidates.length > 0 && (
              <div className="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-lg border border-border bg-background p-1">
                {candidates.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handlePickCandidate(c)}
                    className="rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface-elevated"
                  >
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.consoleName}</p>
                  </button>
                ))}
              </div>
            )}
            {matchedPriceChartingId && (
              <p className="text-xs text-positive">
                Matched to SportsCardsPro — real price{" "}
                {matchedPrice != null ? formatMoney(matchedPrice, "USD") : "unavailable"} loaded below.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="sc-player">Player *</Label>
              <Input id="sc-player" value={playerName} onChange={(e) => setPlayerName(e.target.value)} className="bg-background" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="sc-team">Team</Label>
              <Input id="sc-team" value={teamName} onChange={(e) => setTeamName(e.target.value)} className="bg-background" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="sc-year">Year</Label>
              <Input id="sc-year" type="number" value={year} onChange={(e) => setYear(e.target.value)} className="bg-background" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="sc-number">Card #</Label>
              <Input id="sc-number" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} className="bg-background" />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="sc-set">Set / product *</Label>
            <Input
              id="sc-set"
              value={setName}
              onChange={(e) => setSetName(e.target.value)}
              placeholder="e.g. 2023 Panini Prizm Basketball"
              className="bg-background"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="sc-parallel">Parallel</Label>
            <Input
              id="sc-parallel"
              value={parallelName}
              onChange={(e) => setParallelName(e.target.value)}
              placeholder="Leave blank for Base"
              className="bg-background"
            />
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={isAutograph} onCheckedChange={(v) => setIsAutograph(!!v)} /> Autograph
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={isRelic} onCheckedChange={(v) => setIsRelic(!!v)} /> Relic / memorabilia
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="sc-serial">Serial # (yours)</Label>
              <Input
                id="sc-serial"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="e.g. 23"
                className="bg-background"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="sc-limit">Numbered to</Label>
              <Input
                id="sc-limit"
                value={serialLimit}
                onChange={(e) => setSerialLimit(e.target.value)}
                placeholder="e.g. 99 (or 1 for 1/1)"
                className="bg-background"
              />
            </div>
          </div>
          {(serialNumber || serialLimit) && (
            <p className="-mt-2 text-xs text-muted-foreground">
              Shown as {serialNumber || "?"}/{serialLimit || "?"}
            </p>
          )}

          {portfolios.length > 1 && (
            <div className="grid gap-1.5">
              <Label>Portfolio</Label>
              <Select value={portfolioId} onValueChange={setPortfolioId}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {portfolios.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="sc-quantity">Quantity</Label>
              <Input
                id="sc-quantity"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="bg-background"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Condition</Label>
              <RadioGroup value={condition} onValueChange={(v) => setCondition(v as CardCondition)} className="flex items-center gap-4 pt-1.5">
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="raw" /> Raw
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="graded" /> Graded
                </label>
              </RadioGroup>
            </div>
          </div>

          {condition === "graded" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="sc-grade-co">Grading co.</Label>
                <Input id="sc-grade-co" value={gradeCompany} onChange={(e) => setGradeCompany(e.target.value)} className="bg-background" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="sc-grade-val">Grade</Label>
                <Input id="sc-grade-val" value={gradeValue} onChange={(e) => setGradeValue(e.target.value)} className="bg-background" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="sc-cost">Cost basis (USD)</Label>
              <Input
                id="sc-cost"
                type="number"
                step="0.01"
                min={0}
                value={costBasis}
                onChange={(e) => setCostBasis(e.target.value)}
                className="bg-background"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="sc-acquired">Acquired on</Label>
              <Input
                id="sc-acquired"
                type="date"
                value={acquiredAt}
                onChange={(e) => setAcquiredAt(e.target.value)}
                className="bg-background"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={submitting || !setName.trim() || !playerName.trim()}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : "Add to Portfolio"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
