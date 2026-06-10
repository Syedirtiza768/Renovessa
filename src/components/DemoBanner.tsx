"use client";

export function DemoBanner() {
  const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  if (!isDemo) return null;

  return (
    <div className="bg-amber-100 border-b border-amber-300 px-4 py-1.5 text-center text-xs font-medium text-amber-800">
      Demo data — for pilot use only
    </div>
  );
}
