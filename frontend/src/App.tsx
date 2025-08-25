import { useState } from "react";
import Connect from "./components/Connect";
import PoolList from "./components/PoolsList";
import AddLiquidity from "./components/AddLiquidity";
import Swap from "./components/Swap";
import RemoveLiquidity from "./components/RemoveLiquidity";
import Farm from "./components/Farm";
import farms from "./farms/intuition.json";
import Navbar from "./components/NavBar";
import "./styles/globals.css";

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("swap");

  const renderContent = () => {
    switch (activeTab) {
      case "addLiquidity":
        return <AddLiquidity />;
      case "removeLiquidity":
        return <RemoveLiquidity />;
      case "swap":
        return <Swap />;
      case "pools":
        return <PoolList />;
      case "farms":
        return (
          <>
            {farms.map((f) => (
              <Farm
                key={f.stakingRewards}
                stakingRewards={f.stakingRewards as `0x${string}`}
                stakingToken={f.stakingToken as `0x${string}`}
                rewardsToken={f.rewardsToken as `0x${string}`}
              />
            ))}
          </>
        );
      default:
        return <Swap />;
    }
  };

  return (
    <div className="containerBody">
      <Navbar setActiveTab={setActiveTab} />
      <div className="contentContainer">
        {renderContent()}
      </div>
    </div>
  );
}
