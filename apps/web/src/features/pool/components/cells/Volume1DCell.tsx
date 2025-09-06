// apps/web/src/features/pools/components/cells/Volume1DCell.tsx
import { fmt } from "../../utils";

export function Volume1DCell({ value }: { value?: number }) {
  return <td>${fmt(value)}</td>;
}
