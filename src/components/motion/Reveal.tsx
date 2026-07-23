'use client';

import { type ReactNode } from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';

type Direction = 'up' | 'down' | 'left' | 'right' | 'none';

const OFFSET: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: 26 },
  down: { x: 0, y: -26 },
  left: { x: 34, y: 0 },
  right: { x: -34, y: 0 },
  none: { x: 0, y: 0 },
};

export interface RevealProps {
  children: ReactNode;
  className?: string;
  /** entry direction */
  from?: Direction;
  /** seconds */
  delay?: number;
  duration?: number;
  /** re-run every time it enters the viewport */
  repeat?: boolean;
  as?: 'div' | 'section' | 'span' | 'li' | 'header' | 'article';
}

/**
 * Scroll-linked reveal. Springs content in as it enters the viewport.
 * Collapses to an instant fade when the user prefers reduced motion.
 */
export function Reveal({
  children,
  className,
  from = 'up',
  delay = 0,
  duration = 0.7,
  repeat = false,
  as = 'div',
}: RevealProps) {
  const reduce = useReducedMotion();
  const { x, y } = reduce ? { x: 0, y: 0 } : OFFSET[from];
  const MotionTag = motion[as];

  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, x, y, filter: reduce ? 'none' : 'blur(6px)' }}
      whileInView={{ opacity: 1, x: 0, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: !repeat, margin: '-12% 0px -12% 0px' }}
      transition={{
        duration: reduce ? 0.2 : duration,
        delay: reduce ? 0 : delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </MotionTag>
  );
}

/**
 * Staggered container — children wrapped in <RevealItem> animate in sequence.
 */
export function RevealGroup({
  children,
  className,
  stagger = 0.08,
  delay = 0,
  as = 'div',
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
  as?: 'div' | 'section' | 'ul' | 'header';
}) {
  const reduce = useReducedMotion();
  const MotionTag = motion[as] as typeof motion.div;

  const container: Variants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: reduce ? 0 : stagger,
        delayChildren: reduce ? 0 : delay,
      },
    },
  };

  return (
    <MotionTag
      className={className}
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-10% 0px -10% 0px' }}
    >
      {children}
    </MotionTag>
  );
}

export function RevealItem({
  children,
  className,
  from = 'up',
  as = 'div',
}: {
  children: ReactNode;
  className?: string;
  from?: Direction;
  as?: 'div' | 'li' | 'article' | 'span';
}) {
  const reduce = useReducedMotion();
  const { x, y } = reduce ? { x: 0, y: 0 } : OFFSET[from];
  const MotionTag = motion[as] as typeof motion.div;

  const item: Variants = {
    hidden: { opacity: 0, x, y, filter: reduce ? 'none' : 'blur(5px)' },
    show: {
      opacity: 1,
      x: 0,
      y: 0,
      filter: 'blur(0px)',
      transition: { duration: reduce ? 0.2 : 0.6, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <MotionTag className={className} variants={item}>
      {children}
    </MotionTag>
  );
}
