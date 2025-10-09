import { NavLink } from "react-router-dom";
import styles from "../styles/footer.module.css";

const Footer = () => {
  return (
    <footer className={styles.footerContainer}>
      <div className={styles.navFooter}>
        <span className={styles.titleFooter}>TrustSwap</span>

        <nav className={styles.footerNav}>
          <NavLink
            to="/swap"
            className={({ isActive }) =>
              `${styles.linkBase} ${isActive ? styles.linkActive : ""}`
            }
          >
            Swap
          </NavLink>
          <NavLink
            to="/pools"
            className={({ isActive }) =>
              `${styles.linkBase} ${isActive ? styles.linkActive : ""}`
            }
          >
            Pools
          </NavLink>
          <NavLink
            to="/portfolio"
            className={({ isActive }) =>
              `${styles.linkBase} ${isActive ? styles.linkActive : ""}`
            }
          >
            Portfolio
          </NavLink>
        </nav>
      </div>

      <div className={styles.bottomFooter}>
        <p>© {new Date().getFullYear()} TrustSwap. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
