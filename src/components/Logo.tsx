export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className="grid h-9 w-9 place-items-center rounded-xl text-primary-foreground"
        style={{ background: "var(--gradient-primary)" }}
        aria-hidden
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12h3l2-5 4 10 2-5h7" />
        </svg>
      </div>
      <div className="flex flex-col leading-none">
        <span className="font-display text-lg font-semibold tracking-tight text-foreground">NeuroTrack</span>
        <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Remote care</span>
      </div>
    </div>
  );
}
