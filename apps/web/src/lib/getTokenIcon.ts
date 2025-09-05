// utils/getTokenIcon.ts
import defaultIcon from "../assets/default-token.png";
import { tokenIcons } from "./tokenIcons";

export function getTokenIcon(address: string) {
  return tokenIcons[address] ?? defaultIcon;
}
