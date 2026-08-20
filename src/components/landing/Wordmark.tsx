export function Wordmark({ compact, inverse }: { compact?: boolean; inverse?: boolean }) {
  const textColor = inverse ? "text-bone-0" : "text-ink-100";
  const metaColor = inverse ? "text-bone-2" : "text-ink-40";

  return (
    <div className="flex items-center gap-2.5">
      <svg
        width={compact ? 24 : 30}
        height={compact ? 24 : 30}
        viewBox="0 0 32 32"
        aria-hidden
        className={`shrink-0 ${textColor}`}
      >
        <path d="M4 14.5 16 4l12 10.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7.5 13.5V28h17V13.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M13.25 28V19h5.5v9" fill="var(--color-accent)" />
        <circle cx="23.5" cy="9" r="1.5" fill="var(--color-accent)" />
      </svg>
      <div>
        <span className={`text-base font-semibold tracking-tight ${textColor}`}>Renovessa</span>
        {!compact && (
          <span className={`ml-2 hidden text-[11px] font-medium ${metaColor} sm:inline`}>
            DMV &middot; DC &middot; MD &middot; VA
          </span>
        )}
      </div>
    </div>
  );
}
