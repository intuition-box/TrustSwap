
import raw from "./intuition.json"
export type FarmPool = {
  name: string
  stakingRewards: `0x${string}`
  stakingToken: `0x${string}`
  rewardsToken: `0x${string}`
  decimalsLp?: number
  decimalsRw?: number
}

export const FARMS: FarmPool[] = raw as FarmPool[]
