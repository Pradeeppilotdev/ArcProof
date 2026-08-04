import { useEffect, useRef, useState } from "react";

export function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const to = Number(target) || 0;
    const from = fromRef.current;
    let start = null;
    let raf = requestAnimationFrame(function step(timestamp) {
      if (start === null) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(from + (to - from) * eased);
      if (progress < 1) {
        raf = requestAnimationFrame(step);
      } else {
        fromRef.current = to;
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}
