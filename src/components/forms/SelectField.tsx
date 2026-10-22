"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function SelectField<T extends string>({
  value,
  onChange,
  options,
  placeholder,
  allowEmpty,
  id,
}: {
  value: T | null | undefined;
  onChange: (v: T | null) => void;
  options: readonly { value: T; label: string }[];
  placeholder?: string;
  allowEmpty?: boolean;
  id?: string;
}) {
  // Base UI renders the raw value in <SelectValue> unless it knows the items;
  // passing them makes the trigger show the label.
  const items = [...(allowEmpty ? [{ value: "__none", label: placeholder ?? "—" }] : []), ...options.map((o) => ({ value: o.value, label: o.label }))];
  return (
    <Select
      items={items}
      value={value ?? (allowEmpty ? "__none" : null)}
      onValueChange={(v) => onChange(v === "__none" || v == null ? null : (v as T))}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder={placeholder ?? "Select"} />
      </SelectTrigger>
      <SelectContent>
        {allowEmpty && <SelectItem value="__none">{placeholder ?? "—"}</SelectItem>}
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
