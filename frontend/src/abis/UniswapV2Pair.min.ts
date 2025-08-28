export const PairABI = [
  { inputs: [], name: 'token0', outputs: [{type:'address'}], stateMutability:'view', type:'function' },
  { inputs: [], name: 'token1', outputs: [{type:'address'}], stateMutability:'view', type:'function' },
  { inputs: [], name: 'getReserves', outputs: [
    { type:'uint112', name:'_reserve0' }, { type:'uint112', name:'_reserve1' }, { type:'uint32', name:'_blockTimestampLast' }
  ], stateMutability:'view', type:'function' },
  { inputs: [], name: 'decimals', outputs: [{type:'uint8'}], stateMutability:'view', type:'function' }, // souvent 18
] as const