import { useState, useEffect, useRef } from 'react';
import styles from "../styles/color.module.css";

type Color = {
  name: string;
  value: string;
};

export default function App() {
  const colors: Color[] = [
    { name: 'Green', value: '#99ff00' },
    { name: 'Blue', value: '#00aaff' },
    { name: 'Red', value: '#ff0000' },
    { name: 'Purple', value: '#aa00ff' },
    { name: 'Yellow', value: '#ffff00' },
  ];

  const [isOpen, setIsOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState<Color>(colors[0]);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = () => setIsOpen(!isOpen);

  const chooseColor = (color: Color) => {
    setSelectedColor(color);
    document.documentElement.style.setProperty('--primary', color.value);
    setIsOpen(false);
  };

  // Fermer le dropdown si on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div>
      <div className={styles.dropdown} ref={dropdownRef}>
        <button className={styles['dropdown-btn']} onClick={toggleDropdown}>
          <div 
            className={styles['color-circle']} 
            style={{ backgroundColor: selectedColor.value }}
          />
        </button>
        {isOpen && (
          <div className={styles['dropdown-content']}>
            {colors.map((color: Color) => (
              <div
                key={color.value}
                className={styles['dropdown-item']}
                onClick={() => chooseColor(color)}
              >
                <div
                  className={styles['color-circle']}
                  style={{ backgroundColor: color.value }}
                />
                <span className={styles['color-name']}>{color.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
