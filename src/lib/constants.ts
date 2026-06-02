export const SERVICE_CATEGORIES = [
  { id: "hvac", label: "HVAC", icon: "❄️" },
  { id: "roofing", label: "Roofing", icon: "🏠" },
  { id: "kitchen", label: "Kitchen", icon: "🍳" },
  { id: "bathroom", label: "Bathroom", icon: "🚿" },
  { id: "plumbing", label: "Plumbing", icon: "🔧" },
  { id: "electrical", label: "Electrical", icon: "⚡" },
  { id: "windows", label: "Windows", icon: "🪟" },
  { id: "flooring", label: "Flooring", icon: "🪵" },
  { id: "painting", label: "Painting", icon: "🎨" },
  { id: "deck", label: "Deck", icon: "🪜" },
  { id: "basement", label: "Basement", icon: "🏗️" },
  { id: "handyman", label: "Handyman", icon: "🔨" },
] as const;

export const URGENCY_OPTIONS = [
  "ASAP",
  "Within 2 weeks",
  "Within 1 month",
  "Just planning",
] as const;

export const BUDGET_RANGES = [
  "Under $1,000",
  "$1,000-$5,000",
  "$5,000-$15,000",
  "$15,000-$50,000",
  "$50,000+",
] as const;

export const CONTACT_TIMES = [
  "Morning",
  "Afternoon",
  "Evening",
  "Any time",
] as const;

export const DMV_ZIPS = [
  "20001", "20002", "20003", "20009", "20011",
  "20814", "20815", "20816", "20817",
  "22201", "22202", "22203", "22204", "22205",
  "22301", "22302", "22304", "22314",
];

export const LEAD_STATUS_LABELS: Record<string, string> = {
  NEW: "New Lead",
  ASSIGNED: "Assigned",
  CALLING: "Call Now",
  QUALIFICATION_IN_PROGRESS: "Qualifying",
  QUALIFIED: "Qualified",
  UNQUALIFIED: "Unqualified",
  SCHEDULING: "Scheduling",
  APPOINTMENT_OFFERED: "Offered to Contractor",
  APPOINTMENT_CONFIRMED: "Appointment Confirmed",
  APPOINTMENT_COMPLETED: "Completed",
  HOMEOWNER_CONFIRMED: "Homeowner Confirmed",
  BILLING_PENDING: "Billing Pending",
  BILLING_APPROVED: "Billing Approved",
  DISPUTED: "Disputed",
  CLOSED: "Closed",
  RECYCLE: "Recycle",
};

export const STATUS_BADGE: Record<string, string> = {
  NEW: "badge-copper",
  ASSIGNED: "badge-blue",
  CALLING: "badge-blue",
  QUALIFICATION_IN_PROGRESS: "badge-blue",
  QUALIFIED: "badge-green",
  UNQUALIFIED: "badge-neutral",
  SCHEDULING: "badge-blue",
  APPOINTMENT_OFFERED: "badge-copper",
  APPOINTMENT_CONFIRMED: "badge-green",
  APPOINTMENT_COMPLETED: "badge-green",
  HOMEOWNER_CONFIRMED: "badge-green",
  BILLING_PENDING: "badge-amber",
  BILLING_APPROVED: "badge-green",
  DISPUTED: "badge-red",
  CLOSED: "badge-neutral",
  RECYCLE: "badge-neutral",
};

export const DEMO_PASSWORD = "demo1234";
