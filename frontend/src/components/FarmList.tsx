import { FARMS } from "../farms/registry"
import Farm from "./Farm"

export default function Farms() {
  return (
    <div className="space-y-4">
      {FARMS.map((p) => (
        <div key={p.stakingRewards}>
          <Farm
            stakingRewards={p.stakingRewards}
            stakingToken={p.stakingToken}
            rewardsToken={p.rewardsToken}
          />
        </div>
      ))}
    </div>
  )
}
