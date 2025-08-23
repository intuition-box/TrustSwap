import Connect from './components/Connect'
import PoolList from './components/PoolsList'
import AddLiquidity from './components/AddLiquidity'
import Swap from './components/Swap'
import RemoveLiquidity from './components/RemoveLiquidity'

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
    </div>
  )
}
