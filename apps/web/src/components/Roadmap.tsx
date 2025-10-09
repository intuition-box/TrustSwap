import React from "react";
import styles from "../styles/roadmap.module.css";
import Footer from "./Footer"

const Roadmap = () => {
  const milestones = [
    { year: 2019, text: "Lancement du projet initial et définition de la vision globale." },
    { year: 2020, text: "Lancement du projet initial et définition de la vision globale." },
    { year: 2021, text: "Mise en place de l’équipe et développement des premières fonctionnalités clés." },
    { year: 2022, text: "Ouverture de la bêta publique et premières intégrations partenaires." },
    { year: 2023, text: "Amélioration de l’expérience utilisateur et expansion internationale." },
    { year: 2024, text: "Lancement officiel de la version complète et adoption rapide du marché." },
    { year: 2025, text: "Optimisation continue, nouvelles collaborations et vision long terme." },
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
        <span className={styles.sousTitleRoadMap}>From safety to scalability, TrustSwap is built to grow with the DeFi community.</span>
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
              <h2>{item.year}</h2>
              <p className={styles.textRoadmap}>{item.text}</p>
            </li>
          ))}
        </ul>
      </div>
      <Footer />
    </div>
  );
};

export default Roadmap;
