// apps/web/src/features/pools/utils.ts
import { formatUnits } from "viem";


export function pct(n?: number | null, digits = 2) {
  if (n == null || !isFinite(n)) return "—";
  const abs = Math.abs(n);
  const floor = 1 / Math.pow(10, digits);
  if (abs !== 0 && abs < floor) return `<${floor.toFixed(digits)}%`;
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n) + "%";
}

export function fmt(n?: number | null, digits = 2) {
  if (n == null || !isFinite(n)) return "—";
  return new Intl.NumberFormat(undefined, {minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);
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
  return (dailyFees / tvlNative) * 365 * 100;
}


export function aprFromStaking(
rewardPerSecNativePrice: number,
tvlStakedNative: number
) {
if (!rewardPerSecNativePrice || !tvlStakedNative) return 0;
const yearlyRewards = rewardPerSecNativePrice * 31_536_000; // 365d
return (yearlyRewards / tvlStakedNative) * 100;
}


export function formatNetworkFeeWei(feeWei: bigint, decimals = 18) {
  try { return `${formatUnits(feeWei, decimals)} tTRUST`; } catch { return "—"; }
}