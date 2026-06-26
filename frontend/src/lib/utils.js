import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatUnits } from "viem";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatUSDC(v) {
  return v == null ? "0.00" : formatUnits(v, 6);
}

export function shorten(a) {
  return a ? a.slice(0, 6) + "\u2026" + a.slice(-4) : "";
}

export function toBytes32(n) {
  return "0x" + n.toString(16).padStart(64, "0");
}
