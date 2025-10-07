// English-only comments
import { toCAIP10 } from "./caip";
import {
  DEFAULT_AMOUNTS,
  DEFAULT_CURVE_ID,
  PREDICATE_LISTED_ON_VAULT_ID,
  TRUSTSWAP_VAULT_ID,
} from "./config";
import { getProtocolClients } from "./getProtocolClients";

// Core protocol functions & event parsers
import {
  getAtomCost,
  getTripleCost,
  createAtoms,
  createTriples,
  deposit,
} from "@0xintuition/protocol";
import {
  eventParseAtomCreated,
  eventParseTripleCreated,
  eventParseDeposited,
} from "@0xintuition/protocol";

/**
 * Create a CAIP-10 atom for a DEX token if missing.
 * Uses core createAtoms(data[], assets[]) where each assets[i] = atomCost + optional initial deposit.
 * Returns the on-chain termId (as bigint) when possible.
 */
export async function createAtomIfNeededForToken(params: {
  chainId: number;
  tokenAddress: `0x${string}`;
  initialDepositWei?: bigint;
}) {
  const { chainId, tokenAddress, initialDepositWei = DEFAULT_AMOUNTS.CREATE_ATOM } = params;
  const { address, publicClient, walletClient } = await getProtocolClients();

  // CAIP-10 uri from chain & token
  const uri = toCAIP10(chainId, tokenAddress) as `0x${string}`;

  // Atom creation cost (fixed part included in 'assets' param)
  const atomCost = await getAtomCost({ address, publicClient });
  const assets = atomCost + (initialDepositWei ?? 0n);

  // Fire transaction (single-atom mode)
  const txHash = await createAtoms(
    { address, walletClient, publicClient },
    {
      args: [[uri], [assets]],
      value: assets,
    }
  );

  // Parse the AtomCreated event to get the vault id
  const events = await eventParseAtomCreated(publicClient, txHash);
  const termId = events[0]?.args.termId; // bigint

  return { txHash, termId }; // termId may be undefined if parsing finds nothing
}

/**
 * Ensure the Trusted Listing triple (subject, LISTED_ON, TRUSTSWAP) exists.
 * We rely on the UI/GraphQL to avoid duplicates; on-chain we just create if the UI says it's missing.
 */
export async function createTrustedListing(params: {
  subjectId: `0x${string}`;                  // atom term_id for the token (hex string)
  predicateId?: `0x${string}`;               // defaults to canonical LISTED_ON
  objectId?: `0x${string}`;                  // defaults to canonical TRUSTSWAP
  initialDepositWei?: bigint;
}) {
  const {
    subjectId,
    predicateId = PREDICATE_LISTED_ON_VAULT_ID,
    objectId = TRUSTSWAP_VAULT_ID,
    initialDepositWei = DEFAULT_AMOUNTS.CREATE_TRIPLE,
  } = params;

  const { address, publicClient, walletClient } = await getProtocolClients();

  // Convert term_ids (hex) to bigint for the contract
  const s = BigInt(subjectId);
  const p = BigInt(predicateId);
  const o = BigInt(objectId);

  // Required assets = tripleCost + optional initial deposit
  const tripleCost = await getTripleCost({ address, publicClient });
  const assets = tripleCost + (initialDepositWei ?? 0n);

  // Fire transaction (single-triple mode)
  const txHash = await createTriples(
    { address, walletClient, publicClient },
    {
      args: [[s], [p], [o], [assets]],
      value: assets,
    }
  );

  // Parse the TripleCreated event to get the triple term id
  const events = await eventParseTripleCreated(publicClient, txHash);
  const tripleId = events[0]?.args.termId; // bigint

  return { txHash, tripleId }; // tripleId may be undefined if parsing finds nothing
}

/**
 * Vote FOR or AGAINST by depositing into the triple or its counter-triple.
 * - pass vaultId = tripleId (FOR) or counterTripleId (AGAINST)
 * - we use DEFAULT_CURVE_ID = 0 and minShares = 1n to avoid slippage reverts
 */
export async function voteOnListing(params: {
  vaultId: `0x${string}` | bigint;
  assetsWei?: bigint;
}) {
  const { vaultId, assetsWei = DEFAULT_AMOUNTS.VOTE } = params;
  const { address, publicClient, walletClient, receiver } = await getProtocolClients();

  const idBigInt = typeof vaultId === "string" ? BigInt(vaultId) : vaultId;
  const idHex = `0x${idBigInt.toString(16)}` as `0x${string}`;

  // minShares = 1 => accept any non-zero shares outcome
  const minShares = 1n;

  const txHash = await deposit(
    { address, walletClient, publicClient },
    {
      args: [receiver, idHex, BigInt(DEFAULT_CURVE_ID), minShares],
      value: assetsWei,
    }
  );

  // Parse Deposited to expose shares minted if needed
  const events = await eventParseDeposited(publicClient, txHash);
  const sharesForReceiver = events[0]?.args.shares; // bigint

  return { txHash, sharesForReceiver };
}
