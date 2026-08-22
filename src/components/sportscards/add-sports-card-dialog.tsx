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
import { CardPhotoField } from "@/components/pc/card-photo-field";
import { usePCStore } from "@/lib/pc/store";
import { SPORTS } from "@/lib/sports/registry";
import { COMMON_DISTRIBUTORS } from "@/lib/sportscards/distributors";
import { formatMoney } from "@/lib/utils/format";
import {
  SUPPORTED_CURRENCIES,
  type SupportedCurrency,
  CARD_CONDITIONS,
  CARD_CONDITION_LABELS,
  type RawCardCondition,
} from "@/lib/constants";
import { pcKind, type CardCondition, type ItemLanguage } from "@/lib/pc/types";
import { resolvePriceAtDate } from "@/lib/pc/resolve-price-at-date";

type Sport = "NBA" | "F1" | "UFC" | "TENNIS";

interface SearchCandidate {
  id: string;
  name: string;
  consoleName: string;
}

interface SearchResponse {
  available: boolean;
  candidates: SearchCandidate[];
}

interface ProductResponse {
  found: boolean;
  priceChartingId?: string;
  suggested?: {
    playerName?: string;
    cardNumber?: string;
    parallelName?: string;
    year?: number;
    distributor?: string;
    setName?: string;
  };
  values?: { loosePrice?: number | null };
}

export function AddSportsCardDialog() {
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Search state
  const [sport, setSport] = React.useState<Sport>("NBA");
  const [query, setQuery] = React.useState("");
  const [searching, setSearching] = React.useState(false);
  const [searchUnavailable, setSearchUnavailable] = React.useState(false);
  const [candidates, setCandidates] = React.useState<SearchCandidate[]>([]);
  const [matchedPriceChartingId, setMatchedPriceChartingId] = React.useState<string | null>(null);
  const [matchedPrice, setMatchedPrice] = React.useState<number | null>(null);

  // Form state (prefillable from a search match, always editable). Year,
  // distributor, and set name are kept as separate fields — not one
  // free-text box — specifically so the display order "[year]
  // [distributor] [setName]" is structural, not dependent on typing order.
  const [year, setYear] = React.useState("");
  const [distributor, setDistributor] = React.useState("");
  const [setName, setSetName] = React.useState("");
  const [playerName, setPlayerName] = React.useState("");
  const [teamName, setTeamName] = React.useState("");
  const [cardNumber, setCardNumber] = React.useState("");
  const [parallelName, setParallelName] = React.useState("");
  const [isAutograph, setIsAutograph] = React.useState(false);
  const [isRelic, setIsRelic] = React.useState(false);
  const [serialNumber, setSerialNumber] = React.useState("");
  const [serialLimit, setSerialLimit] = React.useState("");
  const [imageUrl, setImageUrl] = React.useState("");
  const [holdingImageUrl, setHoldingImageUrl] = React.useState("");

  const [quantity, setQuantity] = React.useState(1);
  const [condition, setCondition] = React.useState<CardCondition>("raw");
  const [gradeCompany, setGradeCompany] = React.useState("PSA");
  const [gradeValue, setGradeValue] = React.useState("10");
  const [rawCondition, setRawCondition] = React.useState<RawCardCondition | "">("");
  const [costBasis, setCostBasis] = React.useState("");
  const [acquiredAt, setAcquiredAt] = React.useState(() => new Date().toISOString().slice(0, 10));

  const pcs = usePCStore((s) => s.pcs);
  const activePCId = usePCStore((s) => s.activePCId);
  const businessMode = usePCStore((s) => s.preferences.businessMode);
  const businessPC = pcs.find((p) => pcKind(p) === "business");
  // Same "default into Business Inventory while Business mode is on" logic
  // as add-holding-dialog.tsx.
  const defaultPCId =
    businessMode && businessPC ? businessPC.id : activePCId;
  const [pcId, setPCId] = React.useState(defaultPCId);
  const addHolding = usePCStore((s) => s.addHolding);
  const lastUsedCostBasisCurrency = usePCStore(
    (s) => s.preferences.lastUsedCostBasisCurrency
  );
  const setLastUsedCostBasisCurrency = usePCStore((s) => s.setLastUsedCostBasisCurrency);
  const [costBasisCurrency, setCostBasisCurrency] = React.useState<SupportedCurrency>(
    lastUsedCostBasisCurrency ?? "USD"
  );

  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setPCId(defaultPCId);
      setCostBasisCurrency(lastUsedCostBasisCurrency ?? "USD");
      setError(null);
    }
  }

  async function handleSearch() {
    if (!query.trim()) return;
    setSearching(true);
    setCandidates([]);
    try {
      const res = await fetch(`/api/sportscards/search?sport=${sport}&q=${encodeURIComponent(query)}`);
      const data = (await res.json()) as SearchResponse;
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
      const data = (await res.json()) as ProductResponse;
      if (!data.found) return;
      setMatchedPriceChartingId(data.priceChartingId ?? null);
      setMatchedPrice(data.values?.loosePrice ?? null);
      if (data.suggested?.playerName) setPlayerName(data.suggested.playerName);
      if (data.suggested?.cardNumber) setCardNumber(data.suggested.cardNumber);
      if (data.suggested?.parallelName) setParallelName(data.suggested.parallelName);
      if (data.suggested?.year) setYear(String(data.suggested.year));
      if (data.suggested?.distributor) setDistributor(data.suggested.distributor);
      if (data.suggested?.setName) setSetName(data.suggested.setName);
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
    setDistributor("");
    setSetName("");
    setPlayerName("");
    setTeamName("");
    setCardNumber("");
    setParallelName("");
    setIsAutograph(false);
    setIsRelic(false);
    setSerialNumber("");
    setSerialLimit("");
    setImageUrl("");
    setHoldingImageUrl("");
    setQuantity(1);
    setCondition("raw");
    setRawCondition("");
    setCostBasis("");
    setCostBasisCurrency(lastUsedCostBasisCurrency ?? "USD");
  }

  async function handleAdd() {
    if (!setName.trim() || !playerName.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/sportscards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceChartingId: matchedPriceChartingId ?? undefined,
          sport,
          year: year ? Number(year) : undefined,
          distributor: distributor.trim() || undefined,
          setName: setName.trim(),
          playerName: playerName.trim(),
          teamName: teamName.trim() || undefined,
          cardNumber: cardNumber.trim() || undefined,
          parallelName: parallelName.trim() || undefined,
          isAutograph,
          isRelic,
          serialLimit: serialLimit.trim() || undefined,
          imageUrl: imageUrl.trim() || undefined,
        }),
      });
      if (!res.ok) {
        setError("Couldn't save this card. Please try again.");
        return;
      }
      const { id: sportsCardItemId } = (await res.json()) as { id: string };

      const priceAtAcquisition = await resolvePriceAtDate({
        date: acquiredAt,
        liveSuggestedPrice: matchedPrice,
        sportsCardItemId,
      });

      // addHolding already rolls the optimistic add back out of the
      // cache on failure (see useRemotePCStore) — awaiting it here means
      // the dialog only closes once the card actually landed, instead of
      // quietly closing on one that never really made it into the PC.
      await addHolding(pcId, {
        kind: "sports",
        sportsCardItemId,
        quantity: Math.max(1, quantity),
        condition,
        gradeCompany: condition === "graded" ? gradeCompany : undefined,
        gradeValue: condition === "graded" ? gradeValue : undefined,
        rawCondition: condition === "raw" && rawCondition ? rawCondition : undefined,
        serialNumber: serialNumber.trim() || undefined,
        language: "EN" as ItemLanguage,
        costBasisTotal: Number(costBasis) || 0,
        costBasisCurrency,
        priceAtAcquisition,
        acquiredAt: new Date(acquiredAt).toISOString(),
        imageUrl: holdingImageUrl.trim() || undefined,
      });
      setLastUsedCostBasisCurrency(costBasisCurrency);

      resetForm();
      setOpen(false);
    } catch {
      setError("Couldn't add this card. Please try again.");
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

          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Set — shown as [Year] [Distributor] [Set Name]
            </p>
            <div className="grid grid-cols-[1fr_1.4fr_1.4fr] gap-2">
              <div className="grid gap-1.5">
                <Label htmlFor="sc-year">Year</Label>
                <Input
                  id="sc-year"
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="2020"
                  className="bg-background"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="sc-distributor">Distributor</Label>
                <Input
                  id="sc-distributor"
                  list="sc-distributor-list"
                  value={distributor}
                  onChange={(e) => setDistributor(e.target.value)}
                  placeholder="Panini"
                  className="bg-background"
                />
                <datalist id="sc-distributor-list">
                  {COMMON_DISTRIBUTORS.map((d) => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="sc-set">Set name *</Label>
                <Input
                  id="sc-set"
                  value={setName}
                  onChange={(e) => setSetName(e.target.value)}
                  placeholder="Mosaic"
                  className="bg-background"
                />
              </div>
            </div>
            {(year || distributor || setName) && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                Shown as &quot;{[year, distributor, setName].filter(Boolean).join(" ") || "…"}&quot;
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="sc-number">Card #</Label>
              <Input id="sc-number" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} className="bg-background" />
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
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={isAutograph} onCheckedChange={(v) => setIsAutograph(!!v)} /> Autograph
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={isRelic} onCheckedChange={(v) => setIsRelic(!!v)} /> Relic / memorabilia
            </label>
          </div>

          <CardPhotoField
            id="sc-image"
            label="Card image (optional)"
            helperText="Shown for this card everywhere it appears — you can also add one later."
            value={imageUrl}
            onChange={setImageUrl}
          />

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

          <CardPhotoField
            id="sc-holding-image"
            label="Photo of your copy (optional)"
            helperText="Your own photo — takes priority over the card image above in your PC."
            value={holdingImageUrl}
            onChange={setHoldingImageUrl}
          />

          {pcs.length > 1 && (
            <div className="grid gap-1.5">
              <Label>PC</Label>
              <Select value={pcId} onValueChange={setPCId}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pcs.map((p) => (
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

          {condition === "raw" && (
            <div className="grid gap-1.5">
              <Label htmlFor="sc-raw-condition">Condition</Label>
              <Select value={rawCondition} onValueChange={(v) => setRawCondition(v as RawCardCondition)}>
                <SelectTrigger id="sc-raw-condition" className="bg-background">
                  <SelectValue placeholder="Not set" />
                </SelectTrigger>
                <SelectContent>
                  {CARD_CONDITIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CARD_CONDITION_LABELS[c]} ({c})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="sc-cost">Cost basis</Label>
              <div className="flex gap-2">
                <Select
                  value={costBasisCurrency}
                  onValueChange={(v) => setCostBasisCurrency(v as SupportedCurrency)}
                >
                  <SelectTrigger className="w-[84px] shrink-0 bg-background" aria-label="Currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_CURRENCIES.map((code) => (
                      <SelectItem key={code} value={code}>
                        {code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

        {error && <p className="text-sm text-negative">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={submitting || !setName.trim() || !playerName.trim()}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : "Add to PC"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
