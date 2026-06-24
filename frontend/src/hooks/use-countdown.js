import { useState, useEffect } from "react";

export function useCountdown(deadline) {
  const [rem, setRem] = useState(Math.max(0, Number(deadline) * 1000 - Date.now()));
  useEffect(() => {
    const iv = setInterval(() => setRem(Math.max(0, Number(deadline) * 1000 - Date.now())), 1000);
    return () => clearInterval(iv);
  }, [deadline]);
  const m = Math.floor(rem / 60000);
  const s = Math.floor((rem % 60000) / 1000);
  return rem > 0 ? `${m}m ${String(s).padStart(2, "0")}s` : "Expired";
}
