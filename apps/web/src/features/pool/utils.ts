// apps/web/src/features/pools/utils.ts
import { formatUnits } from "viem";


export function pct(n?: number | null, digits = 2) {
if (n == null) return "—";
return `${n.toFixed(digits)}%`;
}


export function fmt(num?: number | null, digits = 2) {
if (num == null) return "—";
if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(digits) + "M";
if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(digits) + "k";
return num.toFixed(digits);
}


export function fmtUnits(x?: bigint, decimals = 18, digits = 4) {
if (x == null) return "0";
const s = Number(formatUnits(x, decimals));
return s.toFixed(digits);
}


export const FEE_BPS_TO_LPS = 25; // 0.3%


export function aprFromFees(vol1dNative: number, tvlNative: number, feeBps = FEE_BPS_TO_LPS) {
  if (!vol1dNative || !tvlNative) return 0;
  const dailyFees = vol1dNative * (feeBps / 10_000);
  return (dailyFees / tvlNative) * 365 * 100; // %
}


export function aprFromStaking(
rewardPerSecNativePrice: number,
tvlStakedNative: number
) {
if (!rewardPerSecNativePrice || !tvlStakedNative) return 0;
const yearlyRewards = rewardPerSecNativePrice * 31_536_000; // 365d
return (yearlyRewards / tvlStakedNative) * 100;
}