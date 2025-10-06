// apps/web/src/config/intuition.ts
// English-only comments
import { INTUITION } from "@trustswap/sdk";
import { getMultiVaultAddressFromChainId } from "@0xintuition/protocol";

export const CHAIN_ID = INTUITION.id;

// Hardcoded term_ids (32-byte hex)
const PREDICATE_LISTED_ON_VAULT_ID_HARDCODED =
  "0x8a073dbae58b9367d2d6a8a6f0c538f866b6fdad31f7ee556e609c1b8dee31d7" as const;
const TRUSTSWAP_VAULT_ID_HARDCODED =
  "0xb709900072e84b2ef7083b6b91ff1f6ae42ac9ad32a906bf7b38892b9bd10e85" as const;

// Prefer SDK registry; allow env or hardcoded override
export const MULTIVAULT_ADDRESS = (
  import.meta.env.VITE_MULTIVAULT_ADDRESS ??
  getMultiVaultAddressFromChainId(CHAIN_ID)
) as `0x${string}`;

// Resolve term_ids: use env if provided, else hardcoded
const envPredicate = import.meta.env.VITE_PREDICATE_LISTED_ON_VAULT_ID as string | undefined;
const envVault     = import.meta.env.VITE_TRUSTSWAP_VAULT_ID as string | undefined;

export const PREDICATE_LISTED_ON_VAULT_ID = (envPredicate ?? PREDICATE_LISTED_ON_VAULT_ID_HARDCODED) as `0x${string}`;
export const TRUSTSWAP_VAULT_ID          = (envVault ?? TRUSTSWAP_VAULT_ID_HARDCODED) as `0x${string}`;

// Runtime validation so we never end up undefined or malformed
function assertTermId(id: string, label: string): asserts id is `0x${string}` {
  if (!/^0x[0-9a-fA-F]{64}$/.test(id)) {
    throw new Error(`[intuition] ${label} must be a 32-byte hex (0x + 64 hex). Got: ${id}`);
  }
}
assertTermId(PREDICATE_LISTED_ON_VAULT_ID, "PREDICATE_LISTED_ON_VAULT_ID");
assertTermId(TRUSTSWAP_VAULT_ID, "TRUSTSWAP_VAULT_ID");

// Default tTRUST amounts (wei)
export const DEFAULT_AMOUNTS = {
  CREATE_ATOM: 10_000_000_000_000_000n,   // 0.01
  CREATE_TRIPLE: 10_000_000_000_000_000n, // 0.01
  VOTE: 10_000_000_000_000_000n,          // 0.01
} as const;

// We only use the default curve (0) in UI
export const DEFAULT_CURVE_ID = 0;

// Helpful visibility in dev
if (import.meta.env.DEV) {
  console.log("[intuition cfg]", {
    CHAIN_ID,
    MULTIVAULT_ADDRESS,
    PREDICATE: PREDICATE_LISTED_ON_VAULT_ID.slice(0, 10) + "…",
    VAULT: TRUSTSWAP_VAULT_ID.slice(0, 10) + "…",
  });
}
