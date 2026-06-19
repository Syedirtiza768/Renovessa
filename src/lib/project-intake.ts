import { CONTACT_WINDOW_OPTIONS } from "@/lib/landing-data";

export function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "." };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export function mapUrgency(u: string): string {
  const map: Record<string, string> = {
    "As soon as possible": "ASAP",
    "Within 2 weeks": "Within 2 weeks",
    "Within 1 month": "Within 1 month",
    "Just planning": "Just planning",
  };
  return map[u] ?? u;
}

export function mapBudget(b: string): string {
  return b.replace("–", "-");
}

export function mapContact(w: string): string {
  const found = CONTACT_WINDOW_OPTIONS.find((o) => o.value === w);
  if (!found) return "Any time";
  if (w === "morning") return "Morning";
  if (w === "afternoon") return "Afternoon";
  if (w === "evening") return "Evening";
  return "Any time";
}
