// English-only comments
import { INTUITION } from "@trustswap/sdk";
import { getMultiVaultAddressFromChainId } from "@0xintuition/protocol";

export const CHAIN_ID = INTUITION.id;

// Prefer SDK registry; allow env or hardcoded override
export const MULTIVAULT_ADDRESS = (
  import.meta.env.VITE_MULTIVAULT_ADDRESS ??
  getMultiVaultAddressFromChainId(CHAIN_ID)
) as `0x${string}`;

// Canonical predicate/object term_ids (hex strings)
export const PREDICATE_LISTED_ON_VAULT_ID = import.meta.env
  .VITE_PREDICATE_LISTED_ON_VAULT_ID as `0x${string}`;
export const TRUSTSWAP_VAULT_ID = import.meta.env
  .VITE_TRUSTSWAP_VAULT_ID as `0x${string}`;

// Default tTRUST amounts (wei)
export const DEFAULT_AMOUNTS = {
  CREATE_ATOM: 10_000_000_000_000_000n,   // 0.01
  CREATE_TRIPLE: 10_000_000_000_000_000n, // 0.01
  VOTE: 10_000_000_000_000_000n,          // 0.01
} as const;

// We only use the default curve (0) in UI
export const DEFAULT_CURVE_ID = 0;
