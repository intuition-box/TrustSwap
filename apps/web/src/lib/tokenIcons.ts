// tokenIcons.ts
import tTrustIcon from "../assets/trust.png";
import { addresses } from "@trustswap/sdk";

export const tokenIcons: Record<string, string> = {
  [addresses.NATIVE_PLACEHOLDER]: tTrustIcon, 
};
