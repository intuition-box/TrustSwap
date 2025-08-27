import { useState } from "react";
import styles from "../styles/navbar.module.css";
import RainbowConnectButton from "./RainbowConnectButton"; 

// Import des icônes en blanc et gris
import swapWhite from '../images/swap-white.png'
import swapGrey from '../images/swap-grey.png'
import poolWhite from '../images/pool-white.png'
import poolGrey from '../images/pool-grey.png'
import farmWhite from '../images/farm-white.png'
import farmGrey from '../images/farm-grey.png'

const Navbar = ({ setActiveTab }: { setActiveTab: (tab: string) => void }) => {
  const [active, setActive] = useState("swap"); // Swap actif par défaut

  const handleClick = (tab: string) => {
    setActive(tab);
    setActiveTab(tab);
  };

  const indicatorLeft = active === "swap" ? "5%" : active === "pools" ? "29%" : active === "farms" ? "54%" : "76%";

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
            style={{ color: active === "swap" ? "var(--white)" : "grey" }}
            onClick={() => handleClick("swap")}
          >
            <img
              src={active === "swap" ? swapWhite : swapGrey}
              alt="Swap Icon"
              className={styles.logoIconeNav}
            />
            Swap
          </button>

          {/* Pools */}
          <button
            className={styles.btnNavLeft}
            style={{ color: active === "pools" ? "var(--white)" : "grey" }}
            onClick={() => handleClick("pools")}
          >
            <img
              src={active === "pools" ? poolWhite : poolGrey}
              alt="Pools Icon"
              className={styles.logoIconeNav}
            />
            Pools
          </button>

          {/* Farms */}
          <button
            className={styles.btnNavLeft}
            style={{ color: active === "farms" ? "var(--white)" : "grey" }}
            onClick={() => handleClick("farms")}
          >
            <img
              src={active === "farms" ? farmWhite : farmGrey}
              alt="Farms Icon"
              className={styles.logoIconeNav}
            />
            Farms
          </button>

          {/* Profil */}
          <button
            className={styles.btnNavLeft}
            style={{ color: active === "profile" ? "var(--white)" : "grey" }}
            onClick={() => handleClick("profile")}
          >
            <img
              src={active === "profile" ? farmWhite : farmGrey}
              alt="Farms Icon"
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
