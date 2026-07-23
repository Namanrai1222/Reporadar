'use client';

import { forwardRef, useRef, type ReactNode, type MouseEvent } from 'react';
import Link from 'next/link';
import { motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

const VARIANT: Record<Variant, string> = {
  primary:
    'bg-[var(--signal)] text-[var(--ink-1000)] font-semibold shadow-[0_10px_30px_-10px_color-mix(in_oklab,var(--signal)_60%,transparent)] hover:brightness-108',
  secondary:
    'text-[var(--text-strong)] glass glass-edge hover:bg-[color-mix(in_oklab,var(--ink-700)_70%,transparent)]',
  ghost:
    'text-[var(--text-muted)] hover:text-[var(--text-strong)] hover:bg-[color-mix(in_oklab,var(--ink-700)_55%,transparent)]',
};

const SIZE: Record<Size, string> = {
  sm: 'h-9 px-4 text-[13px] rounded-lg gap-1.5',
  md: 'h-11 px-6 text-[14px] rounded-xl gap-2',
  lg: 'h-[54px] px-8 text-[15px] rounded-2xl gap-2.5',
};

interface BaseProps {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
  /** magnetic pull strength in px */
  strength?: number;
}

interface AsLink extends BaseProps {
  href: string;
  onClick?: never;
  type?: never;
  disabled?: never;
}
interface AsButton extends BaseProps {
  href?: never;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
}

type Props = AsLink | AsButton;

const BASE =
  'group relative inline-flex items-center justify-center whitespace-nowrap select-none transition-[filter,background-color,color,opacity] duration-200 ease-[var(--e-out)] disabled:opacity-40 disabled:pointer-events-none will-change-transform';

/**
 * Button/Link with a magnetic hover that eases toward the cursor and settles
 * back with spring physics. Reduced-motion users get a static button.
 */
export const MagneticButton = forwardRef<HTMLElement, Props>(function MagneticButton(
  { children, variant = 'primary', size = 'md', className = '', strength = 14, ...rest },
  _ref,
) {
  const reduce = useReducedMotion();
  const wrapRef = useRef<HTMLSpanElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, { stiffness: 220, damping: 16, mass: 0.4 });
  const y = useSpring(my, { stiffness: 220, damping: 16, mass: 0.4 });

  function handleMove(e: MouseEvent) {
    if (reduce || !wrapRef.current) return;
    const r = wrapRef.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    mx.set(px * strength * 2);
    my.set(py * strength * 2);
  }
  function reset() {
    mx.set(0);
    my.set(0);
  }

  const cls = `${BASE} ${SIZE[size]} ${VARIANT[variant]} ${className}`;
  const inner = (
    <>
      <span className="relative z-10 inline-flex items-center gap-[inherit]">{children}</span>
      {variant === 'primary' && (
        <span className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[radial-gradient(120px_circle_at_50%_120%,color-mix(in_oklab,var(--signal-glow)_70%,transparent),transparent)]" />
      )}
    </>
  );

  return (
    <motion.span
      ref={wrapRef}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      style={{ x, y, display: 'inline-flex' }}
      className="relative"
    >
      {'href' in rest && rest.href ? (
        <Link href={rest.href} className={cls}>
          {inner}
        </Link>
      ) : (
        <button
          type={(rest as AsButton).type ?? 'button'}
          onClick={(rest as AsButton).onClick}
          disabled={(rest as AsButton).disabled}
          className={cls}
        >
          {inner}
        </button>
      )}
    </motion.span>
  );
});
