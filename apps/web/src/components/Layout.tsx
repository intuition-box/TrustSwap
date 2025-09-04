import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import styles from "../styles/Layout.module.css";
import PrivyConnect from "./PrivyConnect";

export default function Layout() {
  const location = useLocation();
  const [bgStyle, setBgStyle] = useState({ width: 0, left: 0 });
  const swapRef = useRef<HTMLAnchorElement>(null);
  const poolsRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const activeEl = location.pathname === "/swap" ? swapRef.current : poolsRef.current;
    if (activeEl) {
      const rect = activeEl.getBoundingClientRect();
      const navRect = activeEl.parentElement!.getBoundingClientRect();
      setBgStyle({ width: rect.width, left: rect.left - navRect.left });
    }
  }, [location]);

  return (
    <div>
      <header>
        <div>
          <div>TrustSwap</div>
          <nav className={styles.navbar}>
            <div
              className={styles.activeBg}
              style={{ width: bgStyle.width, left: bgStyle.left }}
            />
            <NavLink
              to="/swap"
              ref={swapRef}
              className={({ isActive }) =>
                `${styles.linkBase} ${isActive ? styles.linkTextActive : ""}`
              }
            >
              Swap
            </NavLink>
            <NavLink
              to="/pools"
              ref={poolsRef}
              className={({ isActive }) =>
                `${styles.linkBase} ${isActive ? styles.linkTextActive : ""}`
              }
            >
                Pools
            </NavLink>
            <div className={styles.line}></div>
              <div className={styles.linkBaseComing}>
                Governance
              <div className={styles.comingMsg}>
                <div className={styles.point}></div>
                <span className={styles.comingSoonLabel}>Coming</span>
              </div>
            </div>
          </nav>
          <div><PrivyConnect /></div>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
