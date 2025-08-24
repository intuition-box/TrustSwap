import Connect from './components/Connect'
import PoolList from './components/PoolsList'
import AddLiquidity from './components/AddLiquidity'
import Swap from './components/Swap'
import RemoveLiquidity from './components/RemoveLiquidity'
import Farm from './components/Farm'
import farms from './farms/intuition.json'

export default function App() {
  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: 24 }}>
      <h1>Intuition DEX (Uniswap V2)</h1>
      <Connect />
      <hr />
      <AddLiquidity />
      <hr />
      <RemoveLiquidity />
      <hr />
      <Swap />
      <hr />
      <PoolList />
      <hr />
      {farms.map((f) => (
        <Farm
          key={f.stakingRewards}
          stakingRewards={f.stakingRewards as `0x${string}`}
          stakingToken={f.stakingToken as `0x${string}`}
          rewardsToken={f.rewardsToken as `0x${string}`}
        />
      ))}
    </div>
  )
}
