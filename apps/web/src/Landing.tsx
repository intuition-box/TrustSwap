import styles from "../../web/src/styles/Landing.module.css";
import  NavbarLanding  from "../src/landing/navbar";
import SwapFeature from "../src/features/swap";
import TrustIcone from "../src/assets/trust.png";

function Landing() {
  return (
    <div className={styles.bodyLanding}>
        <div className={styles.headerLanding}>
          <div className={styles.priceTrust}>
          <img src={TrustIcone} alt="trust" className={styles.logoLandingIcone} />
          <span className={styles.nameTokenLanding}>TRUST</span>
          <span className={styles.priceLandingToken}>
            <span className={styles.dollarLanding}>$</span>
            12.00
          </span>

          <span className={styles.var24hPositif}>+ 3.45%</span>
          </div>
          <div className={styles.priceTswp}>
          <img src={TrustIcone} alt="trust" className={styles.logoLandingIcone} />
          <span className={styles.nameTokenLanding}>TSWP</span>
          <span className={styles.priceLandingToken}>
            <span className={styles.dollarLanding}>$</span>
            1.37
          </span>

          <span className={styles.var24hNegatif}>- 10.24%</span>
          </div>
        <NavbarLanding />
          <div className={styles.titleTrustswapContainer}>
            <h1 className={styles.titleTrustswap}>Secure Swaps<br></br>You Can Always Trust.</h1>
            <div className={styles.containerSwapLanding}>
            <SwapFeature />
            </div>
          </div>
        </div>

        <div className={styles.mainLanding}>

        </div>
    </div>
  );
}

export default Landing;
