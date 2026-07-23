'use client';

import { useRef, type ReactNode, type MouseEvent } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion';

interface Props {
  children: ReactNode;
  className?: string;
  /** enable subtle 3D tilt toward the cursor */
  tilt?: boolean;
  /** max tilt in degrees */
  tiltMax?: number;
}

/**
 * A glass card that tracks the pointer: a soft signal spotlight follows the
 * cursor and (optionally) the surface tilts in 3D. Springy, reduced-motion safe.
 */
export function SpotlightCard({ children, className = '', tilt = true, tiltMax = 6 }: Props) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 150, damping: 18 });
  const sry = useSpring(ry, { stiffness: 150, damping: 18 });
  const rotateX = useTransform(srx, (v) => `${v}deg`);
  const rotateY = useTransform(sry, (v) => `${v}deg`);

  function onMove(e: MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty('--mx', `${px * 100}%`);
    el.style.setProperty('--my', `${py * 100}%`);
    if (tilt && !reduce) {
      ry.set((px - 0.5) * tiltMax * 2);
      rx.set(-(py - 0.5) * tiltMax * 2);
    }
  }
  function onLeave() {
    rx.set(0);
    ry.set(0);
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={tilt && !reduce ? { rotateX, rotateY, transformPerspective: 900 } : undefined}
      className={`spotlight glass glass-edge rounded-2xl transition-colors duration-300 ${className}`}
    >
      {children}
    </motion.div>
  );
}
