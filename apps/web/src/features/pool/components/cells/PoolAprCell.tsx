// apps/web/src/features/pools/components/cells/PoolAprCell.tsx
import { pct } from "../../utils";

export function PoolAprCell({ value }: { value?: number }) {
  return <td>{pct(value)}</td>;
}