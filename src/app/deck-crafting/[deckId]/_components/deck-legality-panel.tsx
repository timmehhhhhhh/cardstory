import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DeckValidation } from "@/lib/deck-crafting/validate";
import type { DeckFormat } from "@/lib/deck-crafting/formats";

export function DeckLegalityPanel({ validation, format }: { validation: DeckValidation; format: DeckFormat }) {
  const issues: string[] = [];
  for (const s of validation.sections) {
    if (!s.ok) {
      const need = s.section.max === s.section.min ? `exactly ${s.section.min}` : `${s.section.min}–${s.section.max ?? "∞"}`;
      issues.push(`${s.section.label} needs ${need} (currently ${s.count}).`);
    }
    if (s.mismatched.length > 0) {
      issues.push(`${s.mismatched.length} card${s.mismatched.length === 1 ? "" : "s"} in ${s.section.label} may not belong there.`);
    }
  }
  for (const c of validation.combinedCounts) {
    if (!c.ok) {
      const need = c.max === c.min ? `exactly ${c.min}` : `${c.min}–${c.max ?? "∞"}`;
      issues.push(`${c.label} needs ${need} (currently ${c.count}).`);
    }
  }
  for (const v of validation.copyLimitViolations) {
    issues.push(`"${v.name}" has ${v.count} copies — the limit is ${v.max}.`);
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-2 flex items-center gap-2">
        {validation.isTournamentLegal ? (
          <CheckCircle2 className="size-4 flex-none text-emerald-500" />
        ) : (
          <AlertTriangle className="size-4 flex-none text-amber-500" />
        )}
        <h2 className="font-heading text-sm font-semibold">
          {validation.isTournamentLegal
            ? "Tournament legal"
            : validation.isComplete
              ? "Complete, but not tournament legal"
              : "Not yet complete"}
        </h2>
      </div>

      {issues.length > 0 && (
        <ul className="mb-2 flex flex-col gap-1 text-xs text-muted-foreground">
          {issues.map((issue, i) => (
            <li key={i}>• {issue}</li>
          ))}
        </ul>
      )}

      {validation.bannedCardsPresent.length > 0 && (
        <div className="mt-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2">
          <p className="text-xs font-medium text-destructive">
            Not suitable for official events — contains banned card{validation.bannedCardsPresent.length === 1 ? "" : "s"}:{" "}
            {validation.bannedCardsPresent.map((b) => `${b.name}${b.quantity > 1 ? ` (×${b.quantity})` : ""}`).join(", ")}
          </p>
        </div>
      )}

      {format.informationalRules.length > 0 && (
        <div className={cn("mt-3 flex flex-col gap-1 border-t border-border pt-3")}>
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Not automatically checked</p>
          <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
            {format.informationalRules.map((rule, i) => (
              <li key={i}>• {rule}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
