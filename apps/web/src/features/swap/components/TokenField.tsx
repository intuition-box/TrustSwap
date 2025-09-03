import type { Address } from "viem";
import TokenSelector from "./TokenSelector";
import AmountInput from "./AmountInput";

export default function TokenField(props: {
  label: string;
  token: Address;
  onTokenChange: (a: Address) => void;
  amount?: string;
  onAmountChange?: (v: string) => void;
  readOnly?: boolean;
}) {
  return (
    <div >
      <div>
        <span >{props.label}</span>
      </div>
      <div >
        <TokenSelector value={props.token} onChange={props.onTokenChange} />
        <AmountInput
          value={props.amount ?? ""}
          onChange={props.onAmountChange}
          readOnly={props.readOnly}
          placeholder={props.readOnly ? "-" : "0.0"}
        />
      </div>
    </div>
  );
}
