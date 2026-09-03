"use client";

import * as React from "react";
import { Languages } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ITEM_LANGUAGES } from "@/lib/pc/types";
import { LANGUAGE_LABELS } from "@/lib/format/language";

/**
 * Which card languages should show up while browsing/searching/adding
 * cards. A sibling of ConditionPricingSection rather than a use of
 * settings-client.tsx's SettingRow — a checklist of five languages doesn't
 * fit that component's single right-aligned control slot — but it reuses
 * the same container/header shape so it still reads as one more row.
 *
 * An empty selection means "no restriction" (see visibleLanguages on the
 * User model) — unchecking every box would silently hide the whole
 * catalog, so the UI instead treats "nothing checked" as "everything
 * checked" and just resets the filter to unrestricted.
 */
export function LanguageVisibilitySection() {
  const { data: session, update } = useSession();
  const [pending, setPending] = React.useState(false);
  const visible = session?.user?.visibleLanguages ?? [];
  // Every box reads as checked when the filter is unrestricted (empty
  // array), rather than showing a confusing all-unchecked state.
  const isChecked = (lang: string) => visible.length === 0 || visible.includes(lang);

  async function commit(next: string[]) {
    // "Every box checked" collapses back to the unrestricted [] rather than
    // persisting a full list — keeps a newly-added future language visible
    // by default instead of silently excluded from someone's old selection.
    const toSave = next.length === ITEM_LANGUAGES.length ? [] : next;
    setPending(true);
    try {
      const res = await fetch("/api/account/language-visibility", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ languages: toSave }),
      });
      if (res.ok) {
        await update({ visibleLanguages: toSave });
      } else {
        toast.error("Couldn't update your language filter.");
      }
    } catch {
      toast.error("Couldn't update your language filter.");
    } finally {
      setPending(false);
    }
  }

  function toggle(lang: string, checked: boolean) {
    const current = ITEM_LANGUAGES.filter((l) => isChecked(l));
    const next = checked ? [...current, lang] : current.filter((l) => l !== lang);
    // Refuse to go to zero — an empty selection means "unrestricted" (see
    // visibleLanguages on the User model), so saving it here would do the
    // opposite of what unchecking the last box was trying to do.
    if (next.length === 0) return;
    commit(next);
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <div className="flex gap-3">
        <div className="mt-0.5 text-muted-foreground">
          <Languages className="size-4" />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">Card languages</span>
          <p className="text-sm text-muted-foreground">
            Only show cards in these languages while browsing, searching, and adding cards. Cards you already own
            stay in your collection regardless.
          </p>
        </div>
      </div>
      <div className="ml-7 flex flex-wrap gap-x-5 gap-y-2">
        {ITEM_LANGUAGES.map((lang) => (
          <div key={lang} className="flex items-center gap-2">
            <Checkbox
              id={`language-${lang}`}
              checked={isChecked(lang)}
              disabled={pending}
              onCheckedChange={(checked) => toggle(lang, checked === true)}
            />
            <Label htmlFor={`language-${lang}`} className="text-sm font-normal">
              {LANGUAGE_LABELS[lang] ?? lang}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
}
