// tokenIcons.ts
import tTrustIcon from "../assets/trust.png";
import { addresses } from "@trustswap/sdk";

export const tokenIcons: Record<string, string> = {
  [addresses.NATIVE_PLACEHOLDER]: tTrustIcon, 
  "0xc82d6A5e0Da8Ce7B37330C4D44E9f069269546E6": tTrustIcon, // TKA
};
