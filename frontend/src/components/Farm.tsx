// src/components/Farm.tsx
import { useEffect, useState, useMemo, useRef } from "react";
import { Address, erc20Abi, parseUnits, formatUnits } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import FarmAprBadge from "./FarmAprBadge";
import styles from "../styles/farm.module.css";
import tokenLogo from "../images/token.png"
import arrow from "../images/arrow.png"
import { fmtLP, fmtAmount, fmtAllowance, shortAddr } from "../lib/format";
import { WNATIVE_ADDRESS, NATIVE_SYMBOL, WRAPPED_SYMBOL, SHOW_WRAPPED_SYMBOL } from '../config/protocol'
const WNATIVE = (WNATIVE_ADDRESS || '').toLowerCase();
const NATIVE_SYM = NATIVE_SYMBOL || 'tTRUST';
const WRAPPED_SYM = WRAPPED_SYMBOL || 'WTTRUST';
const SHOW_WRAPPED = Boolean(SHOW_WRAPPED_SYMBOL) === true

function overrideNativeSymbol(addr?: string, onchain?: string) {
  if (!addr) return onchain || 'TKN';
  if (addr.toLowerCase() === WNATIVE) {
    return SHOW_WRAPPED ? WRAPPED_SYM : NATIVE_SYM;
  }
  return onchain || 'TKN';
}

// 🔒 parseUnits for UI
const tryParseUnits = (v: string, decimals: number): bigint | null => {
  try {
    if (!v) return 0n;
    const s = v.trim().replace(/\s+/g, '').replace(/,/g, '.'); // 1 234,56 -> 1234.56
    if (!/^\d+(\.\d+)?$/.test(s)) return null;
    return parseUnits(s, decimals);
  } catch {
    return null;
  }
};

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
  stakingRewards: Address;
  stakingToken: Address;
  rewardsToken: Address;
};

export default function Farm({ stakingRewards, stakingToken, rewardsToken }: Props) {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  // decimals
  const [decLP, setDecLP] = useState(18);
  const [decRW, setDecRW] = useState(18);
  const [dec0, setDec0] = useState(18);
  const [dec1, setDec1] = useState(18);

  // LP metadata
  const [t0, setT0] = useState<Address>();
  const [t1, setT1] = useState<Address>();
  const [sym0, setSym0] = useState<string>();
  const [sym1, setSym1] = useState<string>();
  const [r0, setR0] = useState<bigint>(0n);
  const [r1, setR1] = useState<bigint>(0n);

  // user state
  const [lpBal, setLpBal] = useState<bigint>(0n);
  const [lpAllow, setLpAllow] = useState<bigint>(0n);
  const [staked, setStaked] = useState<bigint>(0n);
  const [earned, setEarned] = useState<bigint>(0n);

  // UI
  const [amount, setAmount] = useState("0");
  const [pending, setPending] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const poolLabel = useMemo(() => sym0 && sym1 ? `${sym0}-${sym1}` : "LP", [sym0, sym1, stakingToken]);
  const addressFarm = shortAddr(stakingToken);

  const load = async () => {
    if (!publicClient || !address) return;

    // decimals TSWP & LP
    const [dLP, dRW] = await Promise.all([
      publicClient.readContract({ address: stakingToken, abi: erc20Abi, functionName: "decimals" }) as Promise<number>,
      publicClient.readContract({ address: rewardsToken, abi: erc20Abi, functionName: "decimals" }) as Promise<number>,
    ]);
    setDecLP(Number(dLP ?? 18)); setDecRW(Number(dRW ?? 18));

    // LP metadata
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
        publicClient.readContract({ address: stakingToken, abi: PairABI, functionName: "getReserves" })
          .then(x => [x[0] as bigint, x[1] as bigint]),
      ]);
      setSym0(overrideNativeSymbol(token0, s0));
      setSym1(overrideNativeSymbol(token1, s1));
      setDec0(Number(d0 ?? 18)); setDec1(Number(d1 ?? 18));
      setR0(res0); setR1(res1);
    } catch {
      setDec0(18); setDec1(18);
    }

    // user state
    const [bal, allow, st, er] = await Promise.all([
      publicClient.readContract({ address: stakingToken, abi: erc20Abi, functionName: "balanceOf", args: [address] }) as Promise<bigint>,
      publicClient.readContract({ address: stakingToken, abi: erc20Abi, functionName: "allowance", args: [address, stakingRewards] }) as Promise<bigint>,
      publicClient.readContract({ address: stakingRewards, abi: SR_ABI, functionName: "balanceOf", args: [address] }) as Promise<bigint>,
      publicClient.readContract({ address: stakingRewards, abi: SR_ABI, functionName: "earned", args: [address] }) as Promise<bigint>,
    ]);
    setLpBal(bal); setLpAllow(allow); setStaked(st); setEarned(er);
    setLoaded(true);
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
    const amt = tryParseUnits(amount, decLP);
    if (amt === null || amt <= 0n) { alert('Montant invalide'); return; }
    setPending(true);
    try {
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
    const amt = tryParseUnits(amount, decLP);
    if (amt === null || amt <= 0n) { alert('Montant invalide'); return; }
    setPending(true);
    try {
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

  // UI derivatives
  const amt = useMemo(() => tryParseUnits(amount, decLP), [amount, decLP]);
  const needsApproval = useMemo(() => {
    if (!isConnected || !loaded || amt === null) return false;
    return amt > 0n && lpAllow < amt;
  }, [isConnected, loaded, amt, lpAllow]);

  const canStake = useMemo(() => {
    if (!loaded || amt === null) return false;
    return amt > 0n && lpBal >= amt && (!needsApproval);
  }, [loaded, amt, lpBal, needsApproval]);

  const canUnstake = useMemo(() => {
    if (!loaded || amt === null) return false;
    return amt > 0n && staked >= amt;
  }, [loaded, amt, staked]);

  const onMax = () => setAmount(formatUnits(lpBal, decLP));

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = () => setIsOpen(!isOpen);

  // Ferme le dropdown si clic en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={styles.farmContainer}>
      <div 
        className={styles.farm} 
        onClick={() => setIsOpen(!isOpen)} 
        style={{ cursor: 'pointer' }}
      >
        <div className={styles.headerFarm} onClick={() => setIsOpen(!isOpen)} style={{ cursor: 'pointer' }}>
          <div className={styles.titleInfoFarm}>
            <span className={styles.titleFarm}>
            <div className={styles.poolLogoFarm}>
            <img src={tokenLogo} alt="Logo" className={styles.logoTokenFarm} />
             <img src={tokenLogo} alt="Logo" className={styles.logoTokenFarmTwo} />
            </div>
              {poolLabel}
            </span>
            <span className={styles.addressFarm}>{addressFarm}</span>
          </div>
          <FarmAprBadge
          sr={"0xc43172A7e92614d1fb043948ddb04f60fF29Aae9"}
          lp={"0xfEeb70B047808c0eA4510716259513C2E50F2Cd3"}
          wnative={"0x51379Cc2C942EE2AE2fF0BD67a7b475F0be39Dcf"}
          factory={"0xd103E057242881214793d5A1A7c2A5B84731c75c"}
          refreshMs={12000}
          showDetails
        />
        </div>
  
      
         <img
            src={arrow} // ton fichier flèche
            alt="toggle"
            className={`${styles.arrowSelect} ${isOpen ? styles.arrowOpen : ""}`}
         />
  
        {isOpen && (
          <div className={styles.dropdownContent}>
            <small style={{ opacity: 0.8 }}>
              Reserves:&nbsp;
              <b>{fmtAmount(r0, dec0, { dp: 6, compact: true })} {sym0 ?? 'T0'}</b>
              &nbsp;/&nbsp;
              <b>{fmtAmount(r1, dec1, { dp: 6, compact: true })} {sym1 ?? 'T1'}</b>
            </small>
  
            <div style={{ textAlign: 'right', marginTop: '8px' }}>
              <div>Wallet LP: <b>{fmtLP(lpBal, { dp: 6 })}</b></div>
              <div>Staked: <b>{fmtLP(staked, { dp: 6 })}</b></div>
              <div>Earned TSWP: <b>{fmtAmount(earned, decRW, { dp: 6 })}</b></div>
              <div>Allowance → SR: <b>{fmtAllowance(lpAllow)}</b></div>
            </div>
  
            <div style={{ marginTop: '8px' }}>
              <input
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="Amount LP"
                className="border rounded px-2 py-1"
                style={{ marginRight: '4px' }}
              />
              <button onClick={onMax} style={{ opacity: .8, marginRight: '4px' }}>Max</button>
            </div>
  
            <div style={{ marginTop: '4px' }}>
              {needsApproval ? (
                <button onClick={approve} disabled={pending || !loaded}>Approve LP</button>
              ) : (
                <>
                  <button onClick={stake} disabled={pending || !loaded || !canStake} style={{ marginRight: '4px' }}>Stake</button>
                  <button onClick={unstake} disabled={pending || !loaded || !canUnstake}>Unstake</button>
                </>
              )}
              <button onClick={claim} disabled={pending || !loaded} style={{ marginLeft: '4px' }}>Claim</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
  
}
