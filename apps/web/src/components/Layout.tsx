import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import styles from "../styles/Layout.module.css";
import { ConnectButton } from "./ConnectButton";

export default function Layout() {
  const location = useLocation();
  const [bgStyle, setBgStyle] = useState<{ width: number; left: number }>({ width: 0, left: 0 });

  const swapRef = useRef<HTMLAnchorElement>(null);
  const poolsRef = useRef<HTMLAnchorElement>(null);
  const portfolioRef = useRef<HTMLAnchorElement>(null);
  const navRef = useRef<HTMLDivElement>(null);

  function getActiveRef(pathname: string) {
    // Match the first segment; supports subroutes like /portfolio/positions
    if (pathname.startsWith("/swap")) return swapRef.current;
    if (pathname.startsWith("/pools")) return poolsRef.current;
    if (pathname.startsWith("/portfolio")) return portfolioRef.current;
    // Fallback: if unknown route, try to keep current position or default to swap
    return swapRef.current ?? poolsRef.current ?? portfolioRef.current ?? null;
  }

  function measureAndSet() {
    const activeEl = getActiveRef(location.pathname);
    if (!activeEl || !activeEl.parentElement) return;
    const rect = activeEl.getBoundingClientRect();
    const navRect = activeEl.parentElement.getBoundingClientRect();
    setBgStyle({ width: rect.width, left: rect.left - navRect.left });
  }

  useEffect(() => {
    // Recompute on route change (after layout)
    requestAnimationFrame(measureAndSet);
    // Recompute on window resize
    function onResize() {
      requestAnimationFrame(measureAndSet);
    }
    window.addEventListener("resize", onResize);

    // Recompute when the nav container resizes (font load, responsive)
    const ro = new ResizeObserver(() => requestAnimationFrame(measureAndSet));
    if (navRef.current) ro.observe(navRef.current);

    return () => {
      window.removeEventListener("resize", onResize);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return (
    <div>
      <header>
        <div>
          <div className={styles.logoPage}>TrustSwap</div>
          <nav ref={navRef} className={styles.navbar}>
            <div className={styles.navbarLine}></div>
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

          <div className={styles.connectPage}>
            <ConnectButton />
          </div>
        </div>
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  );
}