// apps/web/src/features/trust-gauge/components/TrustGaugeRing.tsx
import React from "react";

type IconRender = (p: { size: number }) => React.ReactNode;

type Props = {
  forCount?: number;
  againstCount?: number;
  ratioFor?: number;        // optional manual override
  size?: number;            // outer diameter of the ring (px)
  thickness?: number;       // ring thickness (px)
  trackColor?: string;
  forColor?: string;
  againstColor?: string;
  className?: string;
  icon?: React.ReactNode | IconRender; // your icon; can be a render function to receive size
  showTrackWhenNoVotes?: boolean;      // default true
};

/** Gauge ring that wraps an inner icon so the ring acts as the icon's border. */
export function TrustGaugeRing({
  forCount,
  againstCount,
  ratioFor: ratioOverride,
  size = 40,
  thickness = 3,
  trackColor = "rgba(255, 255, 255, 0.18)",
  forColor = "#240ee9ff",
  againstColor = "#ec7f26ff",
  className,
  icon,
  showTrackWhenNoVotes = true,
}: Props) {
  // Compute ratio from counts if provided
  let ratioFor = typeof ratioOverride === "number" ? ratioOverride : 0;
  if (typeof forCount === "number" && typeof againstCount === "number") {
    const total = Math.max(0, forCount) + Math.max(0, againstCount);
    ratioFor = total === 0 ? 0 : Math.min(1, Math.max(0, forCount / total));
  }

  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, ratioFor));
  const forLen = clamped * c;
  const againstLen = c - forLen;
  const hasVotes = (forCount ?? 0) + (againstCount ?? 0) > 0;

  const innerSize = Math.max(0, size - thickness * 2);

  // Render icon (supports function for precise sizing)
  const renderIcon = () => {
    if (typeof icon === "function") return (icon as IconRender)({ size: innerSize });
    return icon ?? null;
  };

  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: size,
        height: size,
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
      }}
      aria-label={`Gauge: ${Math.round(clamped * 100)}% for`}
      role="img"
    >
      {/* Ring (SVG) is the only visible border */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ position: "absolute", inset: 0 }}
      >
        {showTrackWhenNoVotes && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={trackColor}
            strokeWidth={thickness}
          />
        )}

        {hasVotes && (
          <>
            {/* AGAINST segment */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={againstColor}
              strokeWidth={thickness}
              strokeLinecap="round"
              strokeDasharray={`${againstLen} ${forLen}`}
              strokeDashoffset={-forLen}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
            {/* FOR segment */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={forColor}
              strokeWidth={thickness}
              strokeLinecap="round"
              strokeDasharray={`${forLen} ${againstLen}`}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </>
        )}
      </svg>

      {/* Inner icon: no extra border, so the ring is the only border */}
      <div
        style={{
          width: innerSize,
          height: innerSize,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          overflow: "hidden",
          // No border/background here to keep the ring as the only border
        }}
      >
        {renderIcon()}
      </div>
    </div>
  );
}
