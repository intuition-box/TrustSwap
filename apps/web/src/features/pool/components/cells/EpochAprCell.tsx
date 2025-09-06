// apps/web/src/features/pools/components/cells/EpochAprCell.tsx
import { pct } from "../../utils";

export function EpochAprCell({ value }: { value?: number }) {
  return <td>{pct(value)}</td>;
}
