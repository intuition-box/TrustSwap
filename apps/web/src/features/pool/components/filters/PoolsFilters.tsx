import { useState, useRef, useEffect } from "react";
import styles from "../../pools.module.css";
import searchIcone from "../../../../assets/search.png";

export function PoolsFilters({
  query,
  onQuery,
}: {
  query: string;
  onQuery: (v: string) => void;
}) {
  const [showInput, setShowInput] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowInput(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div
      className={styles.filters}
      ref={containerRef}
      onClick={() => setShowInput(true)}
    >
      <img
        src={searchIcone}
        alt="search"
        className={styles.searchIconeFilters}
      />
      <input
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        placeholder="Search token / pair..."
        className={styles.searchInputFilters}
        autoFocus
        style={{
          width: showInput ? "20ch" : "0",
          opacity: showInput ? 1 : 0,
          pointerEvents: showInput ? "auto" : "none",
          transition: "width 0.3s ease, opacity 0.3s ease",
          marginLeft: "0.5vh",
        }}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
