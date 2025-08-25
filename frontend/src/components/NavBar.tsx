import ThemeToggleButton from "./ThemeToggleButton";
import Connect from "./Connect";
import styles from "../styles/navbar.module.css";

const Navbar = ({ setActiveTab }: { setActiveTab: (tab: string) => void }) => {
  return (
    <div className={styles.navBar}>
      <div className={styles.navBarLeft}>
        <h2>TrustSwap</h2>
        <button onClick={() => setActiveTab("swap")}>Swap</button>
        <button onClick={() => setActiveTab("addLiquidity")}>Add Liquidity</button>
        <button onClick={() => setActiveTab("removeLiquidity")}>Remove Liquidity</button>
        <button onClick={() => setActiveTab("pools")}>Pools</button>
        <button onClick={() => setActiveTab("farms")}>Farms</button>
      </div>

      <div className={styles.navBarRight}>
        <ThemeToggleButton />
        <Connect />
      </div>
    </div>
  );
};

export default Navbar;
