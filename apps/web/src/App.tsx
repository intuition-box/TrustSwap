import { Button } from "@trustswap/ui";
import { getAddresses } from "@trustswap/sdk";
// Si tu veux afficher la tokenlist générée
import { TRUSTSWAP_TOKENLIST } from "@trustswap/tokenlists";

export default function App() {
  const ADDR = getAddresses(13579); // adapte si ton chainId diffère
  return (
    <div style={{ padding: 24 }}>
      <h1>TrustSwap Web</h1>

      <h3>Adresses (SDK)</h3>
      <pre>{JSON.stringify(ADDR, null, 2)}</pre>

      <h3>Tokenlist ({TRUSTSWAP_TOKENLIST.tokens.length})</h3>
      <ul>
        {TRUSTSWAP_TOKENLIST.tokens.map((t: any) => (
          <li key={t.address}>{t.symbol} — {t.address}</li>
        ))}
      </ul>

      <Button onClick={() => alert("GM TrustSwap!")}>Ping</Button>
    </div>
  );
}
