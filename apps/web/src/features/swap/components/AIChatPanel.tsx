import styles from "@ui/styles/Swap.module.css";

export function AIChatPanel() {
  return (
     <div className={styles.aiChatRoot}>
      <div className={styles.aiChatHeader}>
        <span className={styles.aiChatTitle}>AI Assistant</span>
        <span className={styles.aiChatTag}>beta</span>
      </div>
      <div className={styles.aiChatBody}>
        <p className={styles.aiChatPlaceholder}>
          Coming soon: An AI-powered assistant to help you with your swaps and provide insights
          about the market.
        </p>
      </div>
    </div>
  );
}
