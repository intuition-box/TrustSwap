// tokenIcons.ts
import tTrustIcon from "../assets/trust.png";
import tswp from "../assets/tswp.png";
import { addresses } from "@trustswap/sdk";

export const tokenIcons: Record<string, string> = {
  [addresses.NATIVE_PLACEHOLDER]: tTrustIcon, 
  "0xc82d6A5e0Da8Ce7B37330C4D44E9f069269546E6": tTrustIcon,
  "0x81cFb09cb44f7184Ad934C09F82000701A4bF672" : tTrustIcon,
  "0x7da120065e104C085fAc6f800d257a6296549cF3": tswp,
};
