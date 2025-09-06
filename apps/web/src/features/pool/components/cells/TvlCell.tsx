// apps/web/src/features/pools/components/cells/TvlCell.tsx
import { fmt } from "../../utils";

export function TvlCell({ value }: { value?: number }) {
  return <td>${fmt(value)}</td>;
}
