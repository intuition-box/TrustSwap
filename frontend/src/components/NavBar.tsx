import styles from "../styles/navbar.module.css";
import RainbowConnectButton from "./RainbowConnectButton";

// Import des icônes en blanc et gris
import swapWhite from '../images/swap-white.png'
import swapGrey from '../images/swap-grey.png'
import poolWhite from '../images/pool-white.png'
import poolGrey from '../images/pool-grey.png'
import farmWhite from '../images/farm-white.png'
import farmGrey from '../images/farm-grey.png'
import userWhite from '../images/user-white.png'
import userGrey from '../images/user-grey.png'

type NavbarProps = {
  activeTab: string
  setActiveTab: (tab: string) => void
}

const Navbar = ({ activeTab, setActiveTab }: NavbarProps) => {
  const handleClick = (tab: string) => {
    setActiveTab(tab) // c’est App qui gère le state + hash/localStorage
  };

  const indicatorLeft =
    activeTab === "swap" ? "5%" :
    activeTab === "pools" ? "29%" :
    activeTab === "farms" ? "54%" :
    "76%";

  return (
    <div className={styles.navBar}>
      <span className={styles.titleNav}>TrustSwap</span>

      <div
        className={`${styles.navBarLeft} ${styles.navBarMiddle}`}
        style={{ "--indicator-left": indicatorLeft } as React.CSSProperties}
      >
        <div className={styles.btnMenu}>
          {/* Swap */}
          <button
            className={styles.btnNavLeft}
            style={{ color: activeTab === "swap" ? "var(--white)" : "grey" }}
            onClick={() => handleClick("swap")}
          >
            <img
              src={activeTab === "swap" ? swapWhite : swapGrey}
              alt="Swap Icon"
              className={styles.logoIconeNav}
            />
            Swap
          </button>

          {/* Pools */}
          <button
            className={styles.btnNavLeft}
            style={{ color: activeTab === "pools" ? "var(--white)" : "grey" }}
            onClick={() => handleClick("pools")}
          >
            <img
              src={activeTab === "pools" ? poolWhite : poolGrey}
              alt="Pools Icon"
              className={styles.logoIconeNav}
            />
            Pools
          </button>

          {/* Farms */}
          <button
            className={styles.btnNavLeft}
            style={{ color: activeTab === "farms" ? "var(--white)" : "grey" }}
            onClick={() => handleClick("farms")}
          >
            <img
              src={activeTab === "farms" ? farmWhite : farmGrey}
              alt="Farms Icon"
              className={styles.logoIconeNav}
            />
            Farms
          </button>

          {/* Profile */}
          <button
            className={styles.btnNavLeft}
            style={{ color: activeTab === "profile" ? "var(--white)" : "grey" }}
            onClick={() => handleClick("profile")}
          >
            <img
              src={activeTab === "profile" ? userWhite : userGrey}
              alt="Profile Icon"
              className={styles.logoIconeNav}
            />
            Profile
          </button>
        </div>
      </div>

      <div className={styles.navBarRight}>
        <RainbowConnectButton />
      </div>
    </div>
  );
};

export default Navbar;
