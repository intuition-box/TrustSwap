// English-only comments
import {
  createAtomForToken,
  createTrustedListingTriple,
  voteOnTriple,
} from "@0xintuition/protocol";
import {
  CHAIN_ID,
  DEFAULT_CURVE_ID,
  DEFAULT_AMOUNTS,
  PREDICATE_LISTED_ON_VAULT_ID,
  TRUSTSWAP_VAULT_ID,
} from "../config";

export async function createAtomIfNeededForToken(params: {
  tokenAddress: `0x${string}`;
  assetsWei?: bigint;
}) {
  const { tokenAddress, assetsWei = DEFAULT_AMOUNTS.CREATE_ATOM } = params;
  // This helper should be idempotent on protocol side or will revert if atom exists.
  return createAtomForToken({
    chainId: CHAIN_ID,
    tokenAddress,
    assetsWei,
  });
}

export async function createTrustedListing(params: {
  subjectId: `0x${string}`;              // atom term_id for the token
  assetsWei?: bigint;
  curveId?: number;
  predicateId?: `0x${string}`;           // defaults to canonical "listed_on"
  trustswapId?: `0x${string}`;           // defaults to canonical TRUSTSWAP
}) {
  const {
    subjectId,
    assetsWei = DEFAULT_AMOUNTS.CREATE_TRIPLE,
    curveId = DEFAULT_CURVE_ID,
    predicateId = PREDICATE_LISTED_ON_VAULT_ID,
    trustswapId = TRUSTSWAP_VAULT_ID,
  } = params;

  return createTrustedListingTriple({
    chainId: CHAIN_ID,
    subjectId,
    listedOnId: predicateId,
    trustswapId,
    curveId,
    assetsWei,
  });
}

export async function voteOnListing(params: {
  termId: `0x${string}`; // triple term_id (FOR) or counter_term_id (AGAINST)
  assetsWei?: bigint;
  curveId?: number;
}) {
  const { termId, assetsWei = DEFAULT_AMOUNTS.VOTE, curveId = DEFAULT_CURVE_ID } = params;
  return voteOnTriple({
    chainId: CHAIN_ID,
    termId,
    curveId,
    assetsWei,
  });
}
