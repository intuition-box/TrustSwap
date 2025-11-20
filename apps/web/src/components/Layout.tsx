import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import styles from "../styles/Layout.module.css";
import { ConnectButton } from "./ConnectButton";
import { NetworkSelect } from "./NetworkSelect";
import logo from "../assets/logo.png";

export default function Layout() {
  const location = useLocation();
  const [bgStyle, setBgStyle] = useState<{ width: number; left: number }>({ width: 0, left: 0 });

  const swapRef = useRef<HTMLAnchorElement>(null);
  const poolsRef = useRef<HTMLAnchorElement>(null);
  const portfolioRef = useRef<HTMLAnchorElement>(null);
  const navRef = useRef<HTMLDivElement>(null);

  function getActiveRef(pathname: string) {
    if (pathname.startsWith("/swap")) return swapRef.current;
    if (pathname.startsWith("/pools")) return poolsRef.current;
    if (pathname.startsWith("/portfolio")) return portfolioRef.current;
    return null;
  }

  function measureAndSet() {
    const activeEl = getActiveRef(location.pathname);
    if (!activeEl || !activeEl.parentElement) {
      setBgStyle({ width: 0, left: 0 });
      return;
    }
    const rect = activeEl.getBoundingClientRect();
    const navRect = activeEl.parentElement.getBoundingClientRect();
    setBgStyle({ width: 80, left: rect.left - navRect.left + (rect.width / 2 - 40) });
  }

  useEffect(() => {
    requestAnimationFrame(measureAndSet);
    function onResize() {
      requestAnimationFrame(measureAndSet);
    }
    window.addEventListener("resize", onResize);
    const ro = new ResizeObserver(() => requestAnimationFrame(measureAndSet));
    if (navRef.current) ro.observe(navRef.current);
    return () => {
      window.removeEventListener("resize", onResize);
      ro.disconnect();
    };
  }, [location.pathname]);

  return (
    <div>
      <header>
        <div className={styles.navHeader}>
          <NavLink to="/home" ref={swapRef} className={styles.logoPage}>
          <img
              src={logo}
              alt="TrustSwap"
              className={styles.imgCardTop}
            />
          </NavLink>
          <div className={styles.containerNavBar}>
            <nav ref={navRef} className={styles.navbar}>
              <div className={styles.navbarLine}></div>
              {bgStyle.width > 0 && (
                <>
                  <div
                    className={styles.activeBg}
                    style={{ width: bgStyle.width, left: bgStyle.left }}
                  />
                  <div
                    className={styles.activeBgShadow}
                    style={{ left: bgStyle.left }}
                  />
                </>
              )}
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
              <NavLink
                to="/portfolio"
                ref={portfolioRef}
                className={({ isActive }) =>
                  `${styles.linkBase} ${isActive ? styles.linkTextActive : ""}`
                }
              >
                Portfolio
              </NavLink>
              <div className={styles.line}></div>
              <div className={styles.linkBaseComing}>
                DAO
                <div className={styles.comingTooltip} role="dialog" aria-hidden="true">
                  <div className={styles.comingMsg}>
                    <div className={styles.point}></div>
                    <span className={styles.comingSoonLabel}>Coming</span>
                  </div>
                </div>
              </div>
            </nav>
          </div>
          <div className={styles.connectPage}>
            <ConnectButton />
          </div>
          <div className={styles.networkSelectContainer}>
            <NetworkSelect />
          </div>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
