'use client';

import { useEffect, useRef, useState } from 'react';

interface AnimatedNumberProps {
  /** Target value to animate towards */
  value: number;
  /** Format function (e.g. formatCurrency) */
  format: (n: number) => string;
  /** Animation duration in ms (default 800) */
  duration?: number;
  /** CSS class for the number */
  className?: string;
}

/**
 * Animated count-up number. Smoothly transitions from 0 (or previous value)
 * to the target value using requestAnimationFrame. No external dependencies.
 */
export function AnimatedNumber({
  value,
  format,
  duration = 800,
  className,
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    const diff = to - from;

    if (diff === 0) return;

    const startTime = performance.now();

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic for a snappy feel
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + diff * eased;

      setDisplay(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setDisplay(to);
        prevRef.current = to;
      }
    }

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  return <span className={className}>{format(display)}</span>;
}
