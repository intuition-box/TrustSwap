import styles from "../../web/src/styles/Landing.module.css";
import SwapFeature from "../src/features/swap";
import illustrationOne from "../src/assets/illustrationOne.png";
import intuition from "../src/assets/intuition.png";
import colony from "../src/assets/colony.png";
import gbm from "../src/assets/gbm.png";
import security from "../src/assets/security.png";
import user from "../src/assets/user.png";
import hub from "../src/assets/hub.png";
import Roadmap from "./components/Roadmap"

function Landing() {
  const docsUrl = `${import.meta.env.BASE_URL}docs/`;
  return (
    <div className={styles.bodyLanding}>
    <div className={styles.headerContainer}>
    <div className={styles.containerTitleHeader}>
      <div className={styles.titleContainer}>
      <span className={styles.h1Header}>Built on Trust<br/>Community Powered</span>
      <span className={styles.sousTitleHeader}>Dive into TrustSwap's vision.</span>
      <a className={styles.btnHeaderLanding} href={docsUrl}>
        LightPaper
      </a>
      </div>
      <div className={styles.swapContainerLanding}>
        
        <div className={styles.SwapCardHeader}>
        <div className={styles.halo}></div>
          <div className={styles.swapLanding}>
            <div className={styles.swapCardLineTop}></div>
            <SwapFeature />
            <div className={styles.swapCardLineBottom}></div>
          </div>
        </div>
      </div>
    </div>
    </div>
    <div className={styles.mainContainer}>
      <span className={styles.h2Main}>Where Trust Meets Community and Innovation.</span>
      <span className={styles.sousTitleMain}>From safety to scalability, TrustSwap is built to grow with the DeFi community.</span>
      <div className={styles.containerCardMain}>
        <div className={styles.cardMain}>
        <img
              src={security}
              alt="security"
              className={styles.imgCardTop}
            />
          <div className={styles.titleCard}>Secure Swaps</div>
          <span className={styles.textCard}>Swap tokens instantly with audited contracts and full transparency.</span>
        </div>
        <div className={styles.cardMain}>
        <img
              src={user}
              alt="user"
              className={styles.imgCardTopUser}
            />
        <div className={styles.titleCard}>Driven by Community</div>
        <span className={styles.textCard}>Your participation secures and grows the ecosystem.</span>
        </div>
        <div className={styles.cardMain}>
        <img
              src={hub}
              alt="hub"
              className={styles.imgCardTopHub}
            />
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
        
        <div className={styles.titleContainerMAin}>
          <span>INTUITION</span>
          <span className={styles.titleMobile}>COLONY</span>
        </div>
        <div className={styles.containerCardMainIntuition}>
          <div className={styles.lineCard}></div>
          <div className={styles.cardA}>
            <p className={styles.textCardMainTwo}>
              <span className={styles.textWhite}>The first open and tokenized knowledge graph</span>
              , separating identity, data, and algorithms from the application layer.
            </p>
            <img
              src={intuition}
              alt="search"
              className={styles.illustrationIntuition}
            />
        
          </div>
          <div className={styles.titleContainerMAinMobile}>
          <span>COLONY</span>
          </div>
          <div className={styles.cardB}>
          <p className={styles.textCardMainTwo}>
          <span className={styles.textWhite}>A protocol </span>
            that gives communities the tools to organize, fund, and grow together.</p>
          <img
              src={colony}
              alt="search"
              className={styles.illustrationIntuition}
            />
          </div>
        </div>
        <div className={styles.titleContainerMAin}>
          <span>GBM</span>
          <span className={styles.titleMobile}>Other...</span>
        </div>
        <div className={styles.containerCardMainGbm}>
        <div className={styles.lineCardGrey}></div>
        <div className={styles.cardA}>
        <p className={styles.textCardMainTwo}>
        <span className={styles.textWhite}>An auction protocol </span>
         where every higher bid earns a reward. No more sniping, just fairness.</p>
        <img
          src={gbm}
          alt="search"
          className={styles.illustrationIntuition}
        />
      
        </div>
        <div className={styles.titleContainerMAinMobile}>
          <span>Other...</span>
          </div>
        <div className={styles.cardB}>
        <p className={styles.textCardMainTwoCenter}>
        <span className={styles.textWhite}>Any protocol </span>
          that delivers provable value can be proposed by the community and integrated via the DAO...
        </p>
        </div>
        </div>
        <Roadmap />
     </div>
  
    </div>
  );
}

export default Landing;
