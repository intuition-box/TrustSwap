import { useState } from 'react';
import styles from "../styles/color.module.css";

export default function App() {
  const colors = [
    { name: 'Green', value: '#99ff00' },
    { name: 'Blue', value: '#00aaff' },
    { name: 'Red', value: '#ff0000' },
    { name: 'Purple', value: '#aa00ff' },
  ];

  const [isOpen, setIsOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState(colors[0]);

  const toggleDropdown = () => setIsOpen(!isOpen);

  const chooseColor = (color) => {
    setSelectedColor(color);
    document.documentElement.style.setProperty('--primary', color.value);
    setIsOpen(false);
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div className={styles.dropdown}>
        <button className={styles['dropdown-btn']} onClick={toggleDropdown}>
          {selectedColor.name}
        </button>
        {isOpen && (
          <div className={styles['dropdown-content']}>
            {colors.map((color) => (
              <div
                key={color.value}
                className={styles['dropdown-item']}
                style={{ backgroundColor: color.value, color: '#fff' }}
                onClick={() => chooseColor(color)}
              >
                {color.name}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
