"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SUPPORTED_CURRENCIES } from "@/lib/constants";
import { usePreferencesStore } from "@/lib/pc/store";

export function CurrencySelector() {
  const currency = usePreferencesStore((s) => s.preferences.currency);
  const setCurrency = usePreferencesStore((s) => s.setCurrency);

  return (
    <Select value={currency} onValueChange={(v) => setCurrency(v as typeof currency)}>
      <SelectTrigger
        size="sm"
        className="w-[84px] border-border bg-transparent text-sm text-foreground hover:bg-surface-elevated"
        aria-label="Currency"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {SUPPORTED_CURRENCIES.map((code) => (
          <SelectItem key={code} value={code}>
            {code}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
