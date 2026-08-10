"use client";

import { useEffect, useRef } from "react";

/**
 * A declarative setInterval hook. Pass `null` as delay to pause.
 */
export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef<(() => void) | null>(null);

  // Remember the latest callback in an effect (not during render)
  useEffect(() => {
    savedCallback.current = callback;
  });

  useEffect(() => {
    if (delay === null) return;

    const id = setInterval(() => {
      savedCallback.current?.();
    }, delay);
    return () => clearInterval(id);
  }, [delay]);
}
