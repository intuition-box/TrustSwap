import React, { useEffect, useMemo, useState } from "react"
import { Address, formatUnits, zeroAddress } from "viem"
import { usePublicClient } from "wagmi"
import styles from "../styles/farm.module.css";
import tokenLogo from "../images/token.png"
/** =========================
 *  Minimal ABIs (viem format)
 *  ========================= */
const stakingRewardsAbi = [
  { type: "function", name: "rewardRate", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "periodFinish", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "totalSupply", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "rewardsToken", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "stakingToken", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] }
] as const

const erc20Abi = [
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] }
] as const

const univ2PairAbi = [
  { type: "function", name: "token0", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "token1", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  {
    type: "function",
    name: "getReserves",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint112" }, { type: "uint112" }, { type: "uint32" }]
  },
  { type: "function", name: "totalSupply", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] }
] as const

const univ2FactoryAbi = [
  {
    type: "function",
    name: "getPair",
    stateMutability: "view",
    inputs: [{ type: "address" }, { type: "address" }],
    outputs: [{ type: "address" }]
  }
] as const

/** ================ */
export type FarmAprBadgeProps = {
  sr: Address            // StakingRewards
  lp: Address            // UniswapV2Pair
  wnative: Address       // WTTRUST (wrapped native)
  factory: Address       // UniswapV2Factory
  rewardToken?: Address  // optionnel override
  refreshMs?: number
  className?: string
  showDetails?: boolean
}

/** ============================ */
const SECONDS_PER_YEAR = 31_536_000

function toFloat(amount: bigint, decimals: number): number {
  return parseFloat(formatUnits(amount, decimals))
}

function fmtPct(v?: number) {
  if (v === undefined || Number.isNaN(v)) return "—"
  return `${v.toFixed(2)}%`
}

/** ====================================== */
async function getPriceInWNative(opts: {
  client: any
  token: Address
  wnative: Address
  factory: Address
}): Promise<number | undefined> {
  const { client, token, wnative, factory } = opts
  if (!client) return undefined
  if (token.toLowerCase() === wnative.toLowerCase()) return 1

  const pair = (await client.readContract({
    address: factory,
    abi: univ2FactoryAbi,
    functionName: "getPair",
    args: [token, wnative]
  })) as Address

  if (!pair || pair === zeroAddress) return undefined

  const [token0, [r0, r1], decToken, decWNative] = (await Promise.all([
    client.readContract({ address: pair, abi: univ2PairAbi, functionName: "token0" }) as Promise<Address>,
    client.readContract({ address: pair, abi: univ2PairAbi, functionName: "getReserves" }) as Promise<
      [bigint, bigint, number]
    >,
    client.readContract({ address: token, abi: erc20Abi, functionName: "decimals" }) as Promise<number>,
    client.readContract({ address: wnative, abi: erc20Abi, functionName: "decimals" }) as Promise<number>
  ])) as [Address, [bigint, bigint, number], number, number]

  const tokenIs0 = token0.toLowerCase() === token.toLowerCase()
  const reserveToken = tokenIs0 ? r0 : r1
  const reserveWNat = tokenIs0 ? r1 : r0

  const tokenNorm = toFloat(reserveToken, decToken)
  const wnatNorm = toFloat(reserveWNat, decWNative)

  if (tokenNorm <= 0 || wnatNorm <= 0) return undefined
  return wnatNorm / tokenNorm // WNATIVE per 1 token
}

/** ============================================ */
async function getLpValuationInWNative(opts: {
  client: any
  lp: Address
  wnative: Address
  factory: Address
}): Promise<{
  lpPriceInWNative: number
  lpTotalSupply: number
  token0: Address
  token1: Address
  reserves0: number
  reserves1: number
} | null> {
  const { client, lp, wnative, factory } = opts
  if (!client) return null

  const [token0, token1, reserves, lpSupplyRaw, decLP] = (await Promise.all([
    client.readContract({ address: lp, abi: univ2PairAbi, functionName: "token0" }) as Promise<Address>,
    client.readContract({ address: lp, abi: univ2PairAbi, functionName: "token1" }) as Promise<Address>,
    client.readContract({ address: lp, abi: univ2PairAbi, functionName: "getReserves" }) as Promise<
      [bigint, bigint, number]
    >,
    client.readContract({ address: lp, abi: univ2PairAbi, functionName: "totalSupply" }) as Promise<bigint>,
    client.readContract({ address: lp, abi: erc20Abi, functionName: "decimals" }) as Promise<number>
  ])) as [Address, Address, [bigint, bigint, number], bigint, number]

  const [r0, r1] = reserves

  const [dec0, dec1] = await Promise.all([
    client.readContract({ address: token0, abi: erc20Abi, functionName: "decimals" }) as Promise<number>,
    client.readContract({ address: token1, abi: erc20Abi, functionName: "decimals" }) as Promise<number>
  ])

  const r0Norm = toFloat(r0, dec0)
  const r1Norm = toFloat(r1, dec1)
  const lpSupplyNorm = toFloat(lpSupplyRaw, decLP)

  if (lpSupplyNorm <= 0) return null

  const [p0, p1] = await Promise.all([
    getPriceInWNative({ client, token: token0, wnative, factory }),
    getPriceInWNative({ client, token: token1, wnative, factory })
  ])

  if (p0 === undefined || p1 === undefined) return null

  const tvlPairInWNat = r0Norm * p0 + r1Norm * p1
  const lpPriceInWNative = tvlPairInWNat / lpSupplyNorm

  return { lpPriceInWNative, lpTotalSupply: lpSupplyNorm, token0, token1, reserves0: r0Norm, reserves1: r1Norm }
}

/** =========================== */
async function computeFarmApr(opts: {
  client: any
  sr: Address
  lp: Address
  wnative: Address
  factory: Address
  rewardTokenOverride?: Address
}): Promise<{
  aprPct: number
  expired: boolean
  periodFinish: number
  tvlStakedInWNative: number
  rewardTokenSymbol?: string
}> {
  const { client, sr, lp, wnative, factory, rewardTokenOverride } = opts

  // 1) core SR
  const [rewardRateRaw, periodFinishRaw, totalStakedRaw, rewardsTokenAddr] = (await Promise.all([
    client.readContract({ address: sr, abi: stakingRewardsAbi, functionName: "rewardRate" }) as Promise<bigint>,
    client.readContract({ address: sr, abi: stakingRewardsAbi, functionName: "periodFinish" }) as Promise<bigint>,
    client.readContract({ address: sr, abi: stakingRewardsAbi, functionName: "totalSupply" }) as Promise<bigint>,
    rewardTokenOverride
      ? Promise.resolve(rewardTokenOverride)
      : (client.readContract({
          address: sr,
          abi: stakingRewardsAbi,
          functionName: "rewardsToken"
        }) as Promise<Address>)
  ])) as [bigint, bigint, bigint, Address]

  const now = Math.floor(Date.now() / 1000)
  const periodFinish = Number(periodFinishRaw)
  const expired = now >= periodFinish

  // 2) reward token meta
  const [decRewards, rewardTokenSymbol] = (await Promise.all([
    client.readContract({ address: rewardsTokenAddr, abi: erc20Abi, functionName: "decimals" }) as Promise<number>,
    client
      .readContract({ address: rewardsTokenAddr, abi: erc20Abi, functionName: "symbol" })
      .catch(() => Promise.resolve<string | undefined>(undefined))
  ])) as [number, string | undefined]

  // 3) LP valuation
  const lpVal = await getLpValuationInWNative({ client, lp, wnative, factory })
  if (!lpVal) {
    return { aprPct: 0, expired, periodFinish, tvlStakedInWNative: 0, rewardTokenSymbol }
  }

  // 4) reward token price in WNATIVE
  const pRewardInWNative = await getPriceInWNative({ client, token: rewardsTokenAddr, wnative, factory })
  if (pRewardInWNative === undefined) {
    return { aprPct: 0, expired, periodFinish, tvlStakedInWNative: 0, rewardTokenSymbol }
  }

  // 5) staked TVL (LP -> WNATIVE), utilisée pour APR mais plus affichée
  const decLP =
    (await client.readContract({ address: lp, abi: erc20Abi, functionName: "decimals" }).catch(() => 18)) ?? 18
  const totalStaked = toFloat(totalStakedRaw, Number(decLP))
  const tvlStakedInWNative = totalStaked * lpVal.lpPriceInWNative

  if (expired || tvlStakedInWNative <= 0) {
    return { aprPct: 0, expired, periodFinish, tvlStakedInWNative, rewardTokenSymbol }
  }

  // 6) yearly rewards in WNATIVE
  const rewardRate = parseFloat(formatUnits(rewardRateRaw, decRewards)) // tokens/s
  const annualRewardsTokens = rewardRate * SECONDS_PER_YEAR
  const annualRewardsInWNative = annualRewardsTokens * pRewardInWNative

  // 7) APR
  const aprPct = (annualRewardsInWNative / tvlStakedInWNative) * 100

  return { aprPct, expired, periodFinish, tvlStakedInWNative, rewardTokenSymbol }
}

/** =========================== */
export default function FarmAprBadge({
  sr,
  lp,
  wnative,
  factory,
  rewardToken,
  refreshMs = 12_000,
  className,
  showDetails = false
}: FarmAprBadgeProps) {
  const client = usePublicClient()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [apr, setApr] = useState<number>(0)
  const [expired, setExpired] = useState(false)
  const [periodFinish, setPeriodFinish] = useState<number>(0)
  const [rewardSym, setRewardSym] = useState<string | undefined>(undefined)

  const load = async () => {
    if (!client) return
    try {
      setError(null)
      const res = await computeFarmApr({
        client,
        sr,
        lp,
        wnative,
        factory,
        rewardTokenOverride: rewardToken
      })
      setApr(res.aprPct)
      setExpired(res.expired)
      setPeriodFinish(res.periodFinish)
      setRewardSym(res.rewardTokenSymbol)
      setLoading(false)
    } catch (e: any) {
      console.error(e)
      setError(e?.message ?? "Erreur inconnue")
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const id = setInterval(load, refreshMs)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sr, lp, wnative, factory, rewardToken, refreshMs, client?.chain?.id])

  const finishStr = useMemo(() => {
    if (!periodFinish) return "—"
    try { return new Date(periodFinish * 1000).toLocaleString() }
    catch { return "—" }
  }, [periodFinish])

  return (
    <div className={styles.infoFarm}>
     


      <span className={styles.status}>Status
      <span className={styles.statusInfo}>
  <div
    className={`${styles.pointStatus} ${expired ? styles.expired : styles.active}`}
  ></div>
  {expired ? "Expired" : `Active until ${finishStr}`}
</span>


      </span>
      {showDetails && !loading && !error && (
        <>

         
          {rewardSym && (
            <>
   
              <span className={styles.rewardInfo}>
                Reward
                <span className={styles.statusInfo}>
                              <img src={tokenLogo} alt="Logo" className={styles.logoTokenFarm} />
                  {rewardSym}
                </span>
              </span>
            </>
          )}
        </>
      )}

<span className={styles.aprInfo}>APR:
      {loading ? (
        <span className={styles.statusInfo}>Calcul…</span>
      ) : error ? (
        <span className={styles.statusInfo}  title={error}>—</span>
      ) : (
        <span className={styles.statusInfo}>{fmtPct(apr)}</span>
      )}
      </span>
    </div>
  )
}
