import React from "react";
import styles from "../styles/roadmap.module.css";
import Footer from "./Footer"

const Roadmap = () => {
  const milestones = [
    { year:  "Phase 1", title: "Testnet (MVP)", text: "The experimentation ground. Deployment of the DEX on testnet with the core building blocks: swap, pools, portfolio, and tracking features."},
    { year:  "Phase 2", title: "Mainnet Launch & Communication", text: "Official deployment of the DEX. This is the real kickoff: public launch, start of communication, first users, and first listed projects. We’ll also introduce supporting tools, analytics page, blog, documentation, and the first community channels." },
    { year:  "Phase 3", title: "Colony Integration & First Intuition Features", text: "Implementation of decentralized governance through Colony: domains, dynamic reputation, and lazy voting. In parallel, the first integration of Intuition, introducing reputation-based logic and direct voting features on tokens." },
    { year:  "Phase 4", title: "GBM Launchpad", text: "Deployment of the GBM Auctions module for fair launches. Each auction becomes incentive-driven, transparent, and frictionless." },
    { year:  "Phase 5", title: "Community Action & Exploration of Future Features", text: "Full openness to community proposals. Research and testing of new value-proven protocols, any module suggested and validated through the DAO. The goal: to make TrustSwap evolve as a living ecosystem, powered by its users." },
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
