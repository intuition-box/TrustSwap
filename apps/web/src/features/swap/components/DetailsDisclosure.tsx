import { useState } from "react";
import SlippagePopover from "./SlippagePopover";

export default function DetailsDisclosure({
  slippageBps, onChangeSlippage,
  priceText, priceImpactPct, networkFeeText,
}: {
  slippageBps: number;
  onChangeSlippage: (v: number) => void;
  priceText?: string;             // ex: "1 WTTRUST ≈ 123.456 TSWP"
  priceImpactPct?: number | null; // ex: 0.42 (%)
  networkFeeText?: string | null; // ex: "0.00087 tTRUST"
}) {
  const [open, setOpen] = useState(false);
  const impact = typeof priceImpactPct === "number" ? `${priceImpactPct.toFixed(2)}%` : "—";

  return (
    <div>
      <button onClick={() => setOpen(!open)} aria-expanded={open}>
        {open ? "Hide details" : "Show details"}
        <span>{open ? "▴" : "▾"}</span>
      </button>

      {open && (
        <div>
          <div>
            <span>Slippage</span>
            <SlippagePopover valueBps={slippageBps} onChangeBps={onChangeSlippage} />
          </div>

          <div>
            <span>Price</span>
            <strong>{priceText ?? "—"}</strong>
          </div>

          <div>
            <span>Price impact</span>
            <strong
              style={{ color: typeof priceImpactPct === "number" && priceImpactPct > 1 ? "#ef4444" : "inherit" }}
            >
              {impact}
            </strong>
          </div>

          <div>
            <span>Network fee (est.)</span>
            <strong>{networkFeeText ?? "—"}</strong>
          </div>
        </div>
      )}
    </div>
  );
}
