/*
 * Please refer to https://docs.envio.dev for a thorough guide on all Envio indexer features
 */
import {
  Factory,
  Pair as PairEntity,
  Mint,
  Burn,
  Swap,
  Sync,
  PairContract,
} from "generated";

Factory.PairCreated.handler(async ({ event, context }) => {
  const id = `${event.chainId}_${event.params.pair.toLowerCase()}`;

  const entity: PairEntity = {
    id,
    chainId: BigInt(event.chainId),
    token0: event.params.token0,
    token1: event.params.token1,
    pairAddress: event.params.pair,
    allPairsLength: event.params._3,
    createdAtBlock: BigInt(event.block.number),
    createdAtTx: event.transaction.hash ?? "",
    logIndex: event.logIndex,
  };

  context.Pair.set(entity);
});

PairContract.Mint.handler(async ({ event, context }) => {
  const entity: Mint = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    chainId: BigInt(event.chainId),
    pairAddress: event.srcAddress,
    sender: event.params.sender,
    amount0: event.params.amount0,
    amount1: event.params.amount1,
    createdAtBlock: BigInt(event.block.number),
    createdAtTx: event.transaction.hash ?? "",
    logIndex: event.logIndex,
  };

  context.Mint.set(entity);
});

PairContract.Burn.handler(async ({ event, context }) => {
  const entity: Burn = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    chainId: BigInt(event.chainId),
    pairAddress: event.srcAddress,
    sender: event.params.sender,
    to: event.params.to,
    amount0: event.params.amount0,
    amount1: event.params.amount1,
    createdAtBlock: BigInt(event.block.number),
    createdAtTx: event.transaction.hash ?? "",
    logIndex: event.logIndex,
  };

  context.Burn.set(entity);
});

PairContract.Swap.handler(async ({ event, context }) => {
  const entity: Swap = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    chainId: BigInt(event.chainId),
    pairAddress: event.srcAddress,
    sender: event.params.sender,
    to: event.params.to,
    amount0In: event.params.amount0In,
    amount1In: event.params.amount1In,
    amount0Out: event.params.amount0Out,
    amount1Out: event.params.amount1Out,
    createdAtBlock: BigInt(event.block.number),
    createdAtTx: event.transaction.hash ?? "",
    logIndex: event.logIndex,
  };

  context.Swap.set(entity);
});

PairContract.Sync.handler(async ({ event, context }) => {
  const entity: Sync = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    chainId: BigInt(event.chainId),
    pairAddress: event.srcAddress,
    reserve0: event.params.reserve0,
    reserve1: event.params.reserve1,
    createdAtBlock: BigInt(event.block.number),
    createdAtTx: event.transaction.hash ?? "",
    logIndex: event.logIndex,
  };

  context.Sync.set(entity);
});
