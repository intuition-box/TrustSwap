import styles from "@ui/styles/Swap.module.css";
import arrowIcone from "../../../assets/flip-icone.png";

export default function FlipButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Flip tokens"
      className={styles.flipBtn}
    >
      <img src={arrowIcone} alt="Flip btn" className={styles.flipIcone} />
    </button>
  );
}
