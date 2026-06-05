export function Wordmark({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg
        width={compact ? 22 : 26}
        height={compact ? 22 : 26}
        viewBox="0 0 26 26"
        aria-hidden
        className="shrink-0 text-ink-100"
      >
        {[4, 8, 12, 16, 20, 22].map((x, i) => (
          <rect
            key={x}
            x={x}
            y={26 - [10, 16, 22, 18, 14, 12][i]}
            width={2}
            height={[10, 16, 22, 18, 14, 12][i]}
            fill="currentColor"
            rx={0.5}
          />
        ))}
      </svg>
      <div>
        <span className="text-base font-semibold tracking-tight text-ink-100">Renovessa</span>
        {!compact && (
          <span className="ml-2 hidden text-[11px] font-medium text-ink-40 sm:inline">
            DMV · DC · MD · VA
          </span>
        )}
      </div>
    </div>
  );
}
