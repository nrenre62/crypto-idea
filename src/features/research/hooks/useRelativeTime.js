// hooks/useRelativeTime.js — returns a self-updating "Xm ago" string.
import { useEffect, useState } from 'react';
import { relTime } from '../utils/time';

export function useRelativeTime(date, intervalMs = 30000) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!date) return;
    const id = setInterval(() => tick((n) => n + 1), intervalMs);
    return () => clearInterval(id);
  }, [date, intervalMs]);
  return relTime(date);
}
