export const NOTE_KIND_OPTIONS = [
  { value: "prep", label: "Prep" },
  { value: "reflection", label: "Post-interview reflection" },
  { value: "rejection_learning", label: "Rejection learning" },
  { value: "general", label: "General" },
] as const;

export function parseTags(text: string) {
  return Array.from(new Set(text.split(",").map((t) => t.trim()).filter(Boolean)));
}
