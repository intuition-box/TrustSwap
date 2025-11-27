import {
  UniswapV2Factory,
  UniswapV2Pair,
  Pair as PairEntity,
  Token,
  User,
  Swap,
  Mint,
  Burn,
} from "generated";

// Helper to build stable IDs
function makePairId(chainId: bigint | number, pairAddress: string): string {
  return `${chainId}_${pairAddress.toLowerCase()}`;
}

function makeTokenId(chainId: bigint | number, tokenAddress: string): string {
  return `${chainId}_${tokenAddress.toLowerCase()}`;
}

function makeUserId(chainId: bigint | number, userAddress: string): string {
  return `${chainId}_${userAddress.toLowerCase()}`;
}

/**
 * Handle PairCreated events from UniswapV2Factory
 * - register / update Pair entity
 * - register / update Token entities for token0 / token1
 */

UniswapV2Factory.PairCreated.contractRegister(({ event, context }: any) => {
  context.addUniswapV2Pair(event.params.pair);

  context.log.info(
    `Registered new UniswapV2Pair at ${event.params.pair} (token0=${event.params.token0}, token1=${event.params.token1})`,
  );
});

UniswapV2Factory.PairCreated.handler(async ({ event, context }) => {
  const chainId = BigInt(event.chainId);
  const pairAddress = event.params.pair;
  const pairId = makePairId(chainId, pairAddress);

  // Upsert Pair
  const existingPair = await context.Pair.get(pairId);

  const pairEntity: PairEntity = {
    id: pairId,
    chainId,
    token0: event.params.token0,
    token1: event.params.token1,
    pairAddress,
    allPairsLength: event.params._3,
    createdAtBlock: existingPair
      ? existingPair.createdAtBlock
      : BigInt(event.block.number),
    createdAtTx: existingPair
      ? existingPair.createdAtTx
      : (event.transaction.hash ?? ""),
    logIndex: existingPair ? existingPair.logIndex : event.logIndex,
    swapCount: existingPair ? existingPair.swapCount : 0n,
    mintCount: existingPair ? existingPair.mintCount : 0n,
    burnCount: existingPair ? existingPair.burnCount : 0n,
  };

  await context.Pair.set(pairEntity);

  // Upsert Token0
  const token0Id = makeTokenId(chainId, event.params.token0);
  const existingToken0 = await context.Token.get(token0Id);

  const token0Entity: Token = {
    id: token0Id,
    address: event.params.token0,
    chainId,
    createdAtBlock: existingToken0
      ? existingToken0.createdAtBlock
      : BigInt(event.block.number),
    createdAtTx: existingToken0
      ? existingToken0.createdAtTx
      : (event.transaction.hash ?? ""),
    pairCount: (existingToken0 ? existingToken0.pairCount : 0n) + 1n,
    swapCount: existingToken0 ? existingToken0.swapCount : 0n,
  };

  await context.Token.set(token0Entity);

  // Upsert Token1
  const token1Id = makeTokenId(chainId, event.params.token1);
  const existingToken1 = await context.Token.get(token1Id);

  const token1Entity: Token = {
    id: token1Id,
    address: event.params.token1,
    chainId,
    createdAtBlock: existingToken1
      ? existingToken1.createdAtBlock
      : BigInt(event.block.number),
    createdAtTx: existingToken1
      ? existingToken1.createdAtTx
      : (event.transaction.hash ?? ""),
    pairCount: (existingToken1 ? existingToken1.pairCount : 0n) + 1n,
    swapCount: existingToken1 ? existingToken1.swapCount : 0n,
  };

  await context.Token.set(token1Entity);
});

/**
 * Handle Mint events on UniswapV2Pair
 */
UniswapV2Pair.Mint.handler(async ({ event, context }) => {
  console.log("🔥 Swap event received for", event.srcAddress);

  const chainId = BigInt(event.chainId);
  const pairAddress = event.srcAddress;
  const pairId = makePairId(chainId, pairAddress);

  const mintId = `${chainId}_${event.block.number}_${event.logIndex}`;

  const mintEntity: Mint = {
    id: mintId,
    chainId,
    pairAddress,
    sender: event.params.sender,
    amount0: event.params.amount0,
    amount1: event.params.amount1,
    createdAtBlock: BigInt(event.block.number),
    createdAtTx: event.transaction.hash ?? "",
    logIndex: event.logIndex,
  };

  await context.Mint.set(mintEntity);

  // Update Pair mintCount
  const pair = await context.Pair.get(pairId);
  if (pair) {
    const updatedPair: PairEntity = {
      ...pair,
      mintCount: (pair.mintCount ?? 0n) + 1n,
    };
    await context.Pair.set(updatedPair);
  }
});

/**
 * Handle Burn events on UniswapV2Pair
 */
UniswapV2Pair.Burn.handler(async ({ event, context }) => {
  const chainId = BigInt(event.chainId);
  const pairAddress = event.srcAddress;
  const pairId = makePairId(chainId, pairAddress);

  const burnId = `${chainId}_${event.block.number}_${event.logIndex}`;

  const burnEntity: Burn = {
    id: burnId,
    chainId,
    pairAddress,
    sender: event.params.sender,
    to: event.params.to,
    amount0: event.params.amount0,
    amount1: event.params.amount1,
    createdAtBlock: BigInt(event.block.number),
    createdAtTx: event.transaction.hash ?? "",
    logIndex: event.logIndex,
  };

  await context.Burn.set(burnEntity);

  // Update Pair burnCount
  const pair = await context.Pair.get(pairId);
  if (pair) {
    const updatedPair: PairEntity = {
      ...pair,
      burnCount: (pair.burnCount ?? 0n) + 1n,
    };
    await context.Pair.set(updatedPair);
  }
});

/**
 * Handle Swap events on UniswapV2Pair
 * - create Swap entity
 * - update Pair.swapCount
 * - update User stats
 * - update Token.swapCount for token0/token1
 */
UniswapV2Pair.Swap.handler(async ({ event, context }) => {
  const chainId = BigInt(event.chainId);
  const pairAddress = event.srcAddress; // ✅ this is the pair contract address
  const pairId = makePairId(chainId, pairAddress);

  const swapId = `${chainId}_${event.block.number}_${event.logIndex}`;

  const swapEntity: Swap = {
    id: swapId,
    chainId,
    pairAddress,
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

  await context.Swap.set(swapEntity);

  // Update Pair swapCount
  const pair = await context.Pair.get(pairId);
  if (pair) {
    const updatedPair: PairEntity = {
      ...pair,
      swapCount: (pair.swapCount ?? 0n) + 1n,
    };
    await context.Pair.set(updatedPair);
  }

  // Upsert User based on transaction.from (EOA)
  const txFrom = event.transaction.from ?? event.params.sender;
  const userId = makeUserId(chainId, txFrom);
  const existingUser = await context.User.get(userId);

  const totalAmount0In =
    (existingUser ? existingUser.totalAmount0In : 0n) + event.params.amount0In;
  const totalAmount1In =
    (existingUser ? existingUser.totalAmount1In : 0n) + event.params.amount1In;
  const totalAmount0Out =
    (existingUser ? existingUser.totalAmount0Out : 0n) +
    event.params.amount0Out;
  const totalAmount1Out =
    (existingUser ? existingUser.totalAmount1Out : 0n) +
    event.params.amount1Out;

  const userEntity: User = {
    id: userId,
    address: txFrom,
    chainId,
    swapCount: (existingUser ? existingUser.swapCount : 0n) + 1n,
    totalAmount0In,
    totalAmount1In,
    totalAmount0Out,
    totalAmount1Out,
  };

  await context.User.set(userEntity);

  // Update Token swapCount for token0 / token1
  if (pair) {
    const token0Id = makeTokenId(chainId, pair.token0);
    const token1Id = makeTokenId(chainId, pair.token1);

    const token0 = await context.Token.get(token0Id);
    const token1 = await context.Token.get(token1Id);

    if (token0) {
      await context.Token.set({
        ...token0,
        swapCount: (token0.swapCount ?? 0n) + 1n,
      });
    }

    if (token1) {
      await context.Token.set({
        ...token1,
        swapCount: (token1.swapCount ?? 0n) + 1n,
      });
    }
  }
});