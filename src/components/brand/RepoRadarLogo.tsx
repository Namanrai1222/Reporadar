'use client';

import { useReducedMotion } from 'framer-motion';

/**
 * RepoRadar brand mark — a code shield (</>) overlapping a radar dial
 * with a rotating sweep. Vector recreation of the source logo, tuned
 * to the blueprint palette and animated. Reduced-motion safe.
 */
export function RepoRadarMark({ size = 30, className = '' }: { size?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <svg
      width={(size * 58) / 48}
      height={size}
      viewBox="0 0 58 48"
      fill="none"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id="rr-metal" x1="6" y1="10" x2="26" y2="41" gradientUnits="userSpaceOnUse">
          <stop stopColor="#e8eef1" />
          <stop offset="1" stopColor="#8fa4b0" />
        </linearGradient>
        <linearGradient id="rr-radar" x1="19" y1="8" x2="53" y2="41" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8fe6f4" />
          <stop offset="1" stopColor="#2b9fd8" />
        </linearGradient>
        <linearGradient id="rr-sweep" x1="0" y1="0" x2="14" y2="-14" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8fe6f4" stopOpacity="0.75" />
          <stop offset="1" stopColor="#2b9fd8" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* radar dial (behind, right) */}
      <g transform="translate(37 24)">
        <circle r="17" stroke="url(#rr-radar)" strokeWidth="1" opacity="0.28" />
        <circle r="11.5" stroke="url(#rr-radar)" strokeWidth="1" opacity="0.5" />
        <circle r="6" stroke="url(#rr-radar)" strokeWidth="1" opacity="0.75" />
        <line x1="-17" y1="0" x2="17" y2="0" stroke="url(#rr-radar)" strokeWidth="0.6" opacity="0.25" />
        <line x1="0" y1="-17" x2="0" y2="17" stroke="url(#rr-radar)" strokeWidth="0.6" opacity="0.25" />

        {/* rotating sweep */}
        <g>
          <path d="M0 0 L0 -17 A17 17 0 0 1 13.9 -9.76 Z" fill="url(#rr-sweep)" />
          {!reduce && (
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0"
              to="360"
              dur="4.5s"
              repeatCount="indefinite"
            />
          )}
        </g>

        {/* blip + ping */}
        <circle cx="4.8" cy="-10.4" r="1.4" fill="#8fe6f4" />
        <circle cx="4.8" cy="-10.4" r="1.4" fill="none" stroke="#8fe6f4" strokeWidth="0.8" className={reduce ? '' : 'radar-ping'} />
        <circle r="2" fill="url(#rr-radar)" />
      </g>

      {/* code shield (front, left) */}
      <g>
        <path
          d="M6 15 Q6 11 10 10 L22 10 Q26 11 26 15 L26 25 Q26 35 16 41 Q6 35 6 25 Z"
          fill="url(#rr-metal)"
          fillOpacity="0.14"
          stroke="url(#rr-metal)"
          strokeWidth="1.2"
        />
        <g stroke="#8fe6f4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M14 21 L10.5 25 L14 29" />
          <path d="M17.6 20 L14.6 30" />
          <path d="M18 21 L21.5 25 L18 29" />
        </g>
      </g>
    </svg>
  );
}

export function RepoRadarLogo({
  size = 30,
  className = '',
  wordClassName = 'text-[15px]',
}: {
  size?: number;
  className?: string;
  wordClassName?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <RepoRadarMark size={size} />
      <span className={`font-semibold tracking-tight ${wordClassName}`}>
        <span className="text-[var(--bp-ink-dim)]">Repo</span>
        <span
          style={{
            background: 'linear-gradient(100deg, #8fe6f4, #2b9fd8)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            color: 'transparent',
          }}
        >
          Radar
        </span>
      </span>
    </span>
  );
}
