'use client';

/**
 * Ambient background: soft drifting color fields + a masked grid.
 * Pure CSS, GPU-friendly, and quiet under prefers-reduced-motion
 * (drift is disabled globally in globals.css).
 */
export function Aurora({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {/* base grid, faded toward top */}
      <div className="absolute inset-0 bg-grid bg-grid-fade opacity-[0.5]" />

      {/* drifting light fields */}
      <div
        className="absolute -top-[20%] left-[8%] h-[46vw] w-[46vw] rounded-full animate-drift blur-[120px] opacity-[0.28]"
        style={{ background: 'radial-gradient(circle, var(--signal) 0%, transparent 62%)' }}
      />
      <div
        className="absolute top-[28%] right-[4%] h-[38vw] w-[38vw] rounded-full animate-drift blur-[130px] opacity-[0.22]"
        style={{ background: 'radial-gradient(circle, var(--lumen) 0%, transparent 62%)', animationDelay: '-6s' }}
      />

      {/* vignette to seat everything into the canvas */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 90% at 50% -10%, transparent 40%, var(--canvas) 92%)',
        }}
      />
    </div>
  );
}
