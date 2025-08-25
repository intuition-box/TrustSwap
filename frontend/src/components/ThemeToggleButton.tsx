import React, { useState, useEffect } from "react";
import "../styles/globals.css";

const ThemeToggleButton = () => {
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    document.body.className = theme;
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === "light" ? "dark" : "light"));
  };

  return (
    <button onClick={toggleTheme}>
      Passer en {theme === "light" ? "dark" : "light"} mode
    </button>
  );
};

export default ThemeToggleButton;
