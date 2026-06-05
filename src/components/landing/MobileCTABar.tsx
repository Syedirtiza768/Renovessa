"use client";

import { useEffect, useState } from "react";

export function MobileCTABar() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const target = document.getElementById("request");
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => setHidden(entry.isIntersecting),
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  if (hidden) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-15 bg-bone-0/98 px-4 py-3 backdrop-blur-md md:hidden"
      role="region"
      aria-label="Quick submit"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-ink-100">Submit a free request</p>
          <p className="text-[11px] font-medium text-ink-40">DMV · ~60 seconds · no obligation</p>
        </div>
        <a href="#request" className="landing-btn-primary shrink-0 px-4 py-2.5 text-sm">
          Start →
        </a>
      </div>
    </div>
  );
}
