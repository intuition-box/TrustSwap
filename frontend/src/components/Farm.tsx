// src/components/Farm.tsx
import { useEffect, useState, useMemo } from "react";
import { Address, erc20Abi, parseUnits } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";

// 👉 tes helpers de format
import { fmtLP, fmtAmount, fmtAllowance, shortAddr } from "../lib/format";

const WNATIVE = (import.meta.env.VITE_WNATIVE_ADDRESS || '').toLowerCase();
const NATIVE_SYM = import.meta.env.VITE_NATIVE_SYMBOL || 'tTRUST';
const WRAPPED_SYM = import.meta.env.VITE_WRAPPED_SYMBOL || 'WTTRUST';
const SHOW_WRAPPED = (import.meta.env.VITE_SHOW_WRAPPED_SYMBOL || 'false') === 'true';

function overrideNativeSymbol(addr?: string, onchain?: string) {
  if (!addr) return onchain || 'TKN';
  if (addr.toLowerCase() === WNATIVE) {
    return SHOW_WRAPPED ? WRAPPED_SYM : NATIVE_SYM;
  }
  return onchain || 'TKN';
}

// ABI minimal StakingRewards (Uniswap V2 style)
const SR_ABI = [
  { inputs: [], name: "stakingToken", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "rewardsToken", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "rewardRate", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "rewardsDuration", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "periodFinish", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ type: "address" }], name: "balanceOf", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ type: "address" }], name: "earned", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ type: "uint256" }], name: "stake", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ type: "uint256" }], name: "withdraw", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "getReward", outputs: [], stateMutability: "nonpayable", type: "function" },
] as const;

// ABI minimal Pair
const PairABI = [
  { inputs: [], name: "token0", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "token1", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
  {
    inputs: [],
    name: "getReserves",
    outputs: [
      { type: "uint112", name: "_reserve0" },
      { type: "uint112", name: "_reserve1" },
      { type: "uint32", name: "_blockTimestampLast" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

type Props = {
  stakingRewards: Address; // 0xc43172...
  stakingToken: Address;   // LP 0xfEeb70...
  rewardsToken: Address;   // TSWP 0x7da120...
};

export default function Farm({ stakingRewards, stakingToken, rewardsToken }: Props) {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  // décimaux des tokens
  const [decLP, setDecLP] = useState(18);
  const [decRW, setDecRW] = useState(18);
  const [dec0, setDec0] = useState(18);
  const [dec1, setDec1] = useState(18);

  // métadonnées LP
  const [t0, setT0] = useState<Address>();
  const [t1, setT1] = useState<Address>();
  const [sym0, setSym0] = useState<string>();
  const [sym1, setSym1] = useState<string>();
  const [r0, setR0] = useState<bigint>(0n);
  const [r1, setR1] = useState<bigint>(0n);

  // état utilisateur
  const [lpBal, setLpBal] = useState<bigint>(0n);
  const [lpAllow, setLpAllow] = useState<bigint>(0n);
  const [staked, setStaked] = useState<bigint>(0n);
  const [earned, setEarned] = useState<bigint>(0n);

  // ui
  const [amount, setAmount] = useState("0");
  const [pending, setPending] = useState(false);

  const poolLabel = useMemo(() => {
    const pair = sym0 && sym1 ? `${sym0}-${sym1}` : "LP";
    return `${pair} (${shortAddr(stakingToken)})`;
  }, [sym0, sym1, stakingToken]);

  const load = async () => {
    if (!publicClient || !address) return;

    // décimaux TSWP & LP
    const [dLP, dRW] = await Promise.all([
      publicClient.readContract({ address: stakingToken, abi: erc20Abi, functionName: "decimals" }) as Promise<number>,
      publicClient.readContract({ address: rewardsToken, abi: erc20Abi, functionName: "decimals" }) as Promise<number>,
    ]);
    setDecLP(Number(dLP ?? 18)); setDecRW(Number(dRW ?? 18));

    // Pair meta (token0, token1, symbols, decimals, reserves)
    const [token0, token1] = await Promise.all([
      publicClient.readContract({ address: stakingToken, abi: PairABI, functionName: "token0" }) as Promise<Address>,
      publicClient.readContract({ address: stakingToken, abi: PairABI, functionName: "token1" }) as Promise<Address>,
    ]);
    setT0(token0); setT1(token1);
    try {
      const [[s0, d0], [s1, d1], [res0, res1]] = await Promise.all([
        Promise.all([
          publicClient.readContract({ address: token0, abi: erc20Abi, functionName: "symbol" }) as Promise<string>,
          publicClient.readContract({ address: token0, abi: erc20Abi, functionName: "decimals" }) as Promise<number>,
        ]),
        Promise.all([
          publicClient.readContract({ address: token1, abi: erc20Abi, functionName: "symbol" }) as Promise<string>,
          publicClient.readContract({ address: token1, abi: erc20Abi, functionName: "decimals" }) as Promise<number>,
        ]),
        publicClient
          .readContract({ address: stakingToken, abi: PairABI, functionName: "getReserves" })
          .then((x) => [x[0] as bigint, x[1] as bigint]),
      ]);
      setSym0(overrideNativeSymbol(token0, s0));
      setSym1(overrideNativeSymbol(token1, s1));
      
      setDec0(Number(d0 ?? 18)); setDec1(Number(d1 ?? 18));
      setR0(res0); setR1(res1);
    } catch {
      // tolérant si un token ne respecte pas ERC20 metadata
      setDec0(18); setDec1(18);
    }

    // État wallet + SR
    const [bal, allow, st, er] = await Promise.all([
      publicClient.readContract({ address: stakingToken, abi: erc20Abi, functionName: "balanceOf", args: [address] }) as Promise<bigint>,
      publicClient.readContract({ address: stakingToken, abi: erc20Abi, functionName: "allowance", args: [address, stakingRewards] }) as Promise<bigint>,
      publicClient.readContract({ address: stakingRewards, abi: SR_ABI, functionName: "balanceOf", args: [address] }) as Promise<bigint>,
      publicClient.readContract({ address: stakingRewards, abi: SR_ABI, functionName: "earned", args: [address] }) as Promise<bigint>,
    ]);
    setLpBal(bal); setLpAllow(allow); setStaked(st); setEarned(er);
  };

  useEffect(() => { load(); }, [address, publicClient, stakingRewards, stakingToken, rewardsToken]);

  const approve = async () => {
    if (!walletClient || !address) return;
    const tx = await walletClient.writeContract({
      address: stakingToken,
      abi: erc20Abi,
      functionName: "approve",
      args: [stakingRewards, (2n ** 256n - 1n)],
      account: address,
    });
    await publicClient!.waitForTransactionReceipt({ hash: tx });
    await load();
  };

  const stake = async () => {
    if (!walletClient || !address) return;
    setPending(true);
    try {
      const amt = parseUnits(amount || "0", decLP);
      const tx = await walletClient.writeContract({
        address: stakingRewards,
        abi: SR_ABI,
        functionName: "stake",
        args: [amt],
        account: address,
      });
      await publicClient!.waitForTransactionReceipt({ hash: tx });
      await load();
    } finally { setPending(false); }
  };

  const unstake = async () => {
    if (!walletClient || !address) return;
    setPending(true);
    try {
      const amt = parseUnits(amount || "0", decLP);
      const tx = await walletClient.writeContract({
        address: stakingRewards,
        abi: SR_ABI,
        functionName: "withdraw",
        args: [amt],
        account: address,
      });
      await publicClient!.waitForTransactionReceipt({ hash: tx });
      await load();
    } finally { setPending(false); }
  };

  const claim = async () => {
    if (!walletClient || !address) return;
    setPending(true);
    try {
      const tx = await walletClient.writeContract({
        address: stakingRewards,
        abi: SR_ABI,
        functionName: "getReward",
        args: [],
        account: address,
      });
      await publicClient!.waitForTransactionReceipt({ hash: tx });
      await load();
    } finally { setPending(false); }
  };

  const needApprove = useMemo(() => {
    const need = parseUnits(amount || "0", decLP);
    return isConnected && need > 0n && lpAllow < need;
  }, [amount, decLP, lpAllow, isConnected]);

  return (
    <div style={{ maxWidth: 620, display: 'grid', gap: 10, border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h3 style={{ margin: 0 }}>{poolLabel}</h3>
          <small style={{ opacity: .8 }}>
            Reserves:&nbsp;
            <b>{fmtAmount(r0, dec0, { dp: 6, compact: true })} {sym0 ?? 'T0'}</b>
            &nbsp;/&nbsp;
            <b>{fmtAmount(r1, dec1, { dp: 6, compact: true })} {sym1 ?? 'T1'}</b>
          </small>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div>Wallet LP: <b>{fmtLP(lpBal, { dp: 6 })}</b></div>
          <div>Staked: <b>{fmtLP(staked, { dp: 6 })}</b></div>
          <div>Earned TSWP: <b>{fmtAmount(earned, decRW, { dp: 6 })}</b></div>
          <div>Allowance → SR: <b>{fmtAllowance(lpAllow)}</b></div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="Amount LP"
          className="border rounded px-2 py-1"
        />
        <button onClick={() => setAmount(String(Number(fmtLP(lpBal))))} style={{ opacity: .8 }}>Max</button>

        {needApprove ? (
          <button onClick={approve} disabled={pending}>Approve LP</button>
        ) : (
          <>
            <button onClick={stake} disabled={pending}>Stake</button>
            <button onClick={unstake} disabled={pending}>Unstake</button>
          </>
        )}
        <button onClick={claim} disabled={pending}>Claim</button>
      </div>
    </div>
  );
}
