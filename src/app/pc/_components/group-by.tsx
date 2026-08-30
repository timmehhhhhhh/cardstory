"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { GroupField } from "@/lib/pc/types";

const FIELD_OPTIONS: { value: GroupField; label: string }[] = [
  { value: "none", label: "No Grouping" },
  { value: "set", label: "Set" },
  { value: "cardName", label: "Card Name" },
  { value: "releaseYear", label: "Release Date (Year)" },
];

/**
 * Groups the PC List/Gallery into labeled sections — orthogonal to
 * SortBySelect (src/app/pc/_components/sort-by.tsx), which decides row
 * order both overall and within each section. See groupRows in
 * src/lib/pc/selectors.ts.
 */
export function GroupBySelect({
  field,
  onFieldChange,
}: {
  field: GroupField;
  onFieldChange: (field: GroupField) => void;
}) {
  return (
    <Select value={field} onValueChange={(v) => onFieldChange(v as GroupField)}>
      <SelectTrigger size="sm" className="w-40 bg-surface border-border" aria-label="Group by">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {FIELD_OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
