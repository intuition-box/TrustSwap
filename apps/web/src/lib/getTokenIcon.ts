// utils/getTokenIcon.ts
import defaultIcon from "../assets/default-token.png";
import { tokenIcons } from "./tokenIcons";

export function getTokenIcon(address?: string) {
  if (!address) return defaultIcon;
  const key = address.toLowerCase();
  // find by lowercasing all keys
  for (const k in tokenIcons) {
    if (k.toLowerCase() === key) return tokenIcons[k];
  }
  return defaultIcon;
}
