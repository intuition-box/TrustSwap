import React from "react";
import styles from "../styles/roadmap.module.css";
import Footer from "./Footer"

const Roadmap = () => {
  const milestones = [
    { year:  "Phase 1", title: "MVP Dex Testnet (Swap, Pool, Landing Page, Litepaper...).", text: "trust"},
    { year:  "Phase 2", title: "Deployment TrustSwap on Mainnet.", text: "trust" },
    { year:  "Phase 3", title: "First Integration of the Intuition Protocol (Trust Gauge Token).", text: "trust" },
    { year:  "Phase 4", title: "Ouverture de la bêta publique et premières intégrations partenaires.", text: "trust" },
    { year:  "Phase 5", title: "Ouverture de la bêta publique et premières intégrations partenaires.", text: "trust" },
  ];

  const repeatedMilestones = Array(2)
    .fill(milestones)
    .flat()
    .map((item, i) => ({
      ...item,
      id: i,
      year: `${item.year}`
    }));

  return (
    <div className={styles.roadmapContainer}>
        <span className={styles.roadmapTitle}>Roadmap</span>
        <span className={styles.sousTitleRoadMap}>TrustSwap’s first building blocks: a clear path toward a trust-driven DEX.</span>
      <div className={styles["cards-container"]}>
        <ul
          className={styles.cards}
          style={{ "--items": repeatedMilestones.length } as React.CSSProperties}
        >
          {repeatedMilestones.map((item, i) => (
            <li key={item.id} style={{ "--i": i } as React.CSSProperties}>
              <input
                type="radio"
                id={`item-${i}`}
                name="gallery-item"
                defaultChecked={i === 0}
              />
              <label htmlFor={`item-${i}`}>{item.year}</label>
        
              <p className={styles.textRoadmap}>
              {item.title}
              <span className={styles.text}>{item.text}</span>
              </p>
             
            </li>
          ))}
        </ul>
      </div>
      <Footer />
    </div>
  );
};

export default Roadmap;
