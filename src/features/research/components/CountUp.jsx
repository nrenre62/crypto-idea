// components/CountUp.jsx — pure UI. Counts up once on mount; respects reduced-motion.
import { useEffect, useRef, useState } from 'react';

const REDUCE =
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

export default function CountUp({ value, format = (n) => n, duration = 650 }) {
  const [display, setDisplay] = useState(REDUCE ? value : 0);
  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) { setDisplay(value); return; } // after first paint, reflect directly
    mounted.current = true;
    if (REDUCE) { setDisplay(value); return; }
    let raf, start;
    const step = (now) => {
      if (!start) start = now;
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(value * eased);
      if (t < 1) raf = requestAnimationFrame(step);
      else setDisplay(value);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <>{format(display)}</>;
}
