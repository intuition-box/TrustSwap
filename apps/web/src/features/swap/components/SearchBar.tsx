import React from "react";
import styles from "@ui/styles/TokenSelector.module.css";
import searchIcone from "../../../assets/search.png";

export function SearchBar({
  value,
  onChange,
  placeholder = "Search by token, symbol or address...",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className={styles.searchBarSelector}>
      <img src={searchIcone} alt="search" className={styles.searchIcone} />
      <input
        className={styles.searchInput}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus
      />
    </label>
  );
}
