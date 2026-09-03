"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { GroupDateGranularity, GroupField } from "@/lib/pc/types";

const FIELD_OPTIONS: { value: GroupField; label: string }[] = [
  { value: "none", label: "No Grouping" },
  { value: "set", label: "Set" },
  { value: "cardName", label: "Card Name" },
  { value: "releaseYear", label: "Release Date (Year)" },
  { value: "dateAdded", label: "Date Added" },
  { value: "dateAcquired", label: "Date Acquired" },
];

const GRANULARITY_OPTIONS: { value: GroupDateGranularity; label: string }[] = [
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

/**
 * Groups the PC List/Gallery into labeled sections — orthogonal to
 * SortBySelect (src/app/pc/_components/sort-by.tsx), which decides row
 * order both overall and within each section (though for the two date
 * fields here, grouping itself also follows SortBySelect's direction — see
 * groupRows in src/lib/pc/selectors.ts). "Date Added"/"Date Acquired" show
 * a second Month/Year select to pick the bucket size.
 */
export function GroupBySelect({
  field,
  onFieldChange,
  dateGranularity,
  onDateGranularityChange,
}: {
  field: GroupField;
  onFieldChange: (field: GroupField) => void;
  dateGranularity: GroupDateGranularity;
  onDateGranularityChange: (granularity: GroupDateGranularity) => void;
}) {
  const isDateField = field === "dateAdded" || field === "dateAcquired";
  return (
    <div className="flex items-center gap-1.5">
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
      {isDateField && (
        <Select
          value={dateGranularity}
          onValueChange={(v) => onDateGranularityChange(v as GroupDateGranularity)}
        >
          <SelectTrigger size="sm" className="w-24 bg-surface border-border" aria-label="Group by date granularity">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GRANULARITY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
