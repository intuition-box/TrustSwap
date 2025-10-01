import styles from "../../web/src/styles/Landing.module.css";
import  NavbarLanding  from "../src/landing/navbar";
import SwapFeature from "../src/features/swap";
import illustrationOne from "../src/assets/illustrationOne.png";


function Landing() {
  return (
    <div className={styles.bodyLanding}>
    <div className={styles.headerContainer}>
    <div className={styles.haloHeader}></div>
    <div className={styles.containerTitleHeader}>
      <div className={styles.titleContainer}>
      <h1 className={styles.h1Header}>Built on Trust, Powered by Community</h1>
      </div>
      <div className={styles.swapContainerLanding}>

      </div>
    </div>
    </div>
    <div className={styles.mainContainer}>
      <span className={styles.h2Main}>Where Trust Meets Community and Innovation.</span>
      <span className={styles.sousTitleMain}>From safety to scalability, TrustSwap is built to grow with the DeFi community.</span>
      <div className={styles.containerCardMain}>
        <div className={styles.cardMain}>
          <div className={styles.titleCard}>Secure Swaps</div>
          <span className={styles.textCard}>Swap tokens instantly with audited contracts and full transparency.</span>
        </div>
        <div className={styles.cardMain}>
        <div className={styles.titleCard}>Driven by Community</div>
        <span className={styles.textCard}>Your participation secures and grows the ecosystem.</span>
        </div>
        <div className={styles.cardMain}>
        <div className={styles.titleCard}>Multi-Project Hub</div>
        <span className={styles.textCard}>One protocol, multiple integrations: Intuition, Colony, GBM.</span>
        </div>
      </div>
     </div>
     <div className={styles.mainContainer}>
      <span className={styles.h3Main}>“One protocol, many integrations. A unified ecosystem built around TrustSwap.”</span>
       <img
              src={illustrationOne}
              alt="search"
              className={styles.illustrationOne}
            />
        
        <div className={styles.titleContainerMAin}>INTUITION</div>
        <div className={styles.containerCardMainIntuition}>
          <div className={styles.lineCard}></div>
          <div className={styles.cardA}>
            <p className={styles.textCardMainTwo}>The first open and tokenized knowledge graph, separating identity, data, and algorithms from the application layer.</p>
          </div>
          <div className={styles.cardB}>
          <p className={styles.textCardMainTwo}>A semantic data layer that turns raw information into trustable, interoperable knowledge for Web3.</p>
          </div>
        </div>
        <div className={styles.titleContainerMAinReverse}>COLONY</div>
        <div className={styles.containerCardMainColony}>
        <div className={styles.lineCardGrey}></div>
        <div className={styles.cardA}>
        <p className={styles.textCardMainTwo}>From decision-making to resource allocation, everything runs transparently and without middlemen.</p>
        </div>
        <div className={styles.cardB}>
        <p className={styles.textCardMainTwo}>A protocol that gives communities the tools to organize, fund, and grow together.</p>
        </div>
        </div>
        <div className={styles.titleContainerMAin}>GBM</div>
        <div className={styles.containerCardMainGbm}>
        <div className={styles.lineCardGrey}></div>
        <div className={styles.cardA}>
        <p className={styles.textCardMainTwo}>An auction protocol where every bid is rewarded.</p>
        </div>
        <div className={styles.cardB}>
        <p className={styles.textCardMainTwo}>A system where bidding drives both engagement and fairness</p>
        </div>
        </div>
     </div>
    </div>
  );
}

export default Landing;
