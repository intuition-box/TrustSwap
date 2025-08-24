// src/components/Farm.tsx
import { useEffect, useState } from "react";
import { Address, erc20Abi, parseUnits, formatUnits } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";

// ABI minimal StakingRewards (Uniswap V2 style)
const SR_ABI = [
  { inputs: [], name: "stakingToken", outputs: [{type:"address"}], stateMutability:"view", type:"function" },
  { inputs: [], name: "rewardsToken", outputs: [{type:"address"}], stateMutability:"view", type:"function" },
  { inputs: [], name: "rewardRate", outputs: [{type:"uint256"}], stateMutability:"view", type:"function" },
  { inputs: [], name: "rewardsDuration", outputs: [{type:"uint256"}], stateMutability:"view", type:"function" },
  { inputs: [], name: "periodFinish", outputs: [{type:"uint256"}], stateMutability:"view", type:"function" },
  { inputs: [{type:"address"}], name: "balanceOf", outputs: [{type:"uint256"}], stateMutability:"view", type:"function" },
  { inputs: [{type:"address"}], name: "earned", outputs: [{type:"uint256"}], stateMutability:"view", type:"function" },
  { inputs: [{type:"uint256"}], name: "stake", outputs: [], stateMutability:"nonpayable", type:"function" },
  { inputs: [{type:"uint256"}], name: "withdraw", outputs: [], stateMutability:"nonpayable", type:"function" },
  { inputs: [], name: "getReward", outputs: [], stateMutability:"nonpayable", type:"function" },
];

type Props = {
  stakingRewards: Address; // 0xc43172...
  stakingToken: Address;   // LP 0xfEeb70...
  rewardsToken: Address;   // TSWP 0x7da120...
};

export default function Farm({ stakingRewards, stakingToken, rewardsToken }: Props) {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [decLP, setDecLP] = useState(18);
  const [decRW, setDecRW] = useState(18);

  const [lpBal, setLpBal] = useState<bigint>(0n);
  const [lpAllow, setLpAllow] = useState<bigint>(0n);
  const [staked, setStaked] = useState<bigint>(0n);
  const [earned, setEarned] = useState<bigint>(0n);

  const [amount, setAmount] = useState("0");
  const [pending, setPending] = useState(false);

  const load = async () => {
    if (!publicClient || !address) return;
    const [dLP, dRW] = await Promise.all([
      publicClient.readContract({ address: stakingToken, abi: erc20Abi, functionName: "decimals" }) as Promise<number>,
      publicClient.readContract({ address: rewardsToken, abi: erc20Abi, functionName: "decimals" }) as Promise<number>,
    ]);
    setDecLP(Number(dLP)); setDecRW(Number(dRW));

    const [bal, allow, st, er] = await Promise.all([
      publicClient.readContract({ address: stakingToken, abi: erc20Abi, functionName: "balanceOf", args: [address] }) as Promise<bigint>,
      publicClient.readContract({ address: stakingToken, abi: erc20Abi, functionName: "allowance", args: [address, stakingRewards] }) as Promise<bigint>,
      publicClient.readContract({ address: stakingRewards, abi: SR_ABI, functionName: "balanceOf", args: [address] }) as Promise<bigint>,
      publicClient.readContract({ address: stakingRewards, abi: SR_ABI, functionName: "earned", args: [address] }) as Promise<bigint>,
    ]);
    setLpBal(bal); setLpAllow(allow); setStaked(st); setEarned(er);
  };

  useEffect(() => { load(); }, [address, publicClient, stakingRewards, stakingToken]);

  const approve = async () => {
    if (!walletClient || !address) return;
    const tx = await walletClient.writeContract({
      address: stakingToken,
      abi: erc20Abi,
      functionName: "approve",
      args: [stakingRewards, (2n**256n - 1n)],
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

  return (
    <div style={{maxWidth: 520, display:'grid', gap: 8}}>
      <h3>Farm</h3>
      <small>LP balance: {formatUnits(lpBal, decLP)}</small>
      <small>LP allowance: {lpAllow === (2n**256n - 1n) ? "∞" : formatUnits(lpAllow, decLP)}</small>
      <small>Staked: {formatUnits(staked, decLP)}</small>
      <small>Earned TSWP: {formatUnits(earned, decRW)}</small>

      <div style={{display:"flex", gap:8}}>
        <input value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Amount LP" />
        {lpAllow < parseUnits(amount || "0", decLP) ? (
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
