// apps/web/src/features/trust-gauge/components/TrustGaugeRing.jsx
import React from "react";

/** Simple circular ring to display a 0..1 ratio */
export function TrustGaugeRing({
  ratioFor = 0,
  size = 28,
  strokeWidth = 3,
  bgColor = "#E5E7EB",     // light gray
  forColor = "#22C55E",    // green
  againstColor = "#EF4444",// red
}) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;

  // We only draw the "for" arc; "against" is the remainder, represented by the background.
  const forLen = Math.max(0, Math.min(1, ratioFor)) * c;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ display: "block" }}
    >
      {/* Background ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={bgColor}
        strokeWidth={strokeWidth}
      />
      {/* "For" arc */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={forColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={`${forLen} ${c - forLen}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      {/* Optional "against" tick at the end (tiny aesthetic detail) */}
      {ratioFor > 0 && ratioFor < 1 && (
        <circle
          cx={size / 2}
          cy={strokeWidth / 2}
          r={1}
          fill={againstColor}
        />
      )}
    </svg>
  );
}
