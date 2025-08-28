
# TrustSwap (Uniswap V2 fork)

Uniswap V2–style DEX with **native tTRUST** + **wrapped WTTRUST**, Router V2, StakingRewards, and a Vite + React + wagmi + viem frontend.

-   Native coin: `tTRUST` (gas)
    
-   Wrapped ERC-20: `WTTRUST` (used in pairs)
    
-   Rewards token: `TSWP`
    

> ⚠️ **No `.env` files** in the frontend anymore. All config lives in plain TypeScript.

----------

## Monorepo layout

```
.
├─ contracts/         # Hardhat (core V2, router, scripts)
└─ front/             # Vite + React + wagmi + viem

```

----------

## Configuration (no `.env`)

All frontend config lives in `front/src/config/protocol.ts`.

```ts
// front/src/config/protocol.ts
import type { Address } from 'viem'

export const RPC_URL = 'https://testnet.rpc.intuition.systems/http'
export const CHAIN_ID = 13579

export const FACTORY_ADDRESS = '0xd103E057242881214793d5A1A7c2A5B84731c75c' as Address
export const ROUTER_ADDRESS  = '0xA90f2DC77650941a53F5e4f2F345D84f5c0dc2dd' as Address
export const WNATIVE_ADDRESS = '0xc82d6A5e0Da8Ce7B37330C4D44E9f069269546E6' as Address
export const TSWP_ADDRESS    = '0x7da120065e104C085fAc6f800d257a6296549cF3' as Address

export const NATIVE_SYMBOL   = 'tTRUST'
export const WRAPPED_SYMBOL  = 'WTTRUST'
export const SHOW_WRAPPED_SYMBOL = false

// Gas (optional)
export const FORCE_LEGACY_GAS = true
export const GAS_PRICE_GWEI   = 0.2
export const GAS_LIMIT        = 1_200_000n
export const GAS_LIMIT_CREATE_PAIR = 3_000_000n

// Hide token addresses in UI (e.g., old tests)
export const HIDE_TOKENS: Address[] = [
  // '0xDeadBeef...',
]

```

> If you redeploy Factory/Router/WNATIVE/TSWP, update addresses here.  
> The frontend no longer reads `import.meta.env.*`.

----------

## Install & run

### Prereqs

-   Node 18+ (or 20+)
    
-   pnpm 8+
    

### Install deps

```bash
pnpm i -w

```

### Run frontend (dev)

```bash
cd front
pnpm dev

```

### Build contracts

```bash
cd contracts
pnpm compile

```

> Hardhat scripts (deploy, feeTo toggle, etc.) live in `contracts/scripts/*`.

----------

## Add a token via Pull Request (PR)

We accept token additions via PR if they meet simple safety/compat criteria.  
Listing a token is just adding an entry to `front/src/tokens/intuit.ts`.

### 1) Fork & branch

```bash
git checkout -b feat/list-<SYMBOL>

```

### 2) Edit `front/src/tokens/intuit.ts`

```ts
import type { Address } from 'viem'
import { WNATIVE_ADDRESS, TSWP_ADDRESS } from '../config/protocol'

export type Currency = {
  symbol: string
  name: string
  decimals: number
  isNative?: boolean
  address?: Address
  wrapped?: Address
  logoURI?: string
}

export const TOKENS: Currency[] = [
  {
    symbol: 'tTRUST',
    name: 'Intuition Native',
    decimals: 18,
    isNative: true,
    wrapped: WNATIVE_ADDRESS,
    logoURI: '',
  },
  {
    symbol: 'WTTRUST',
    name: 'Wrapped tTRUST',
    decimals: 18,
    address: WNATIVE_ADDRESS,
    logoURI: '',
  },
  {
    symbol: 'TSWP',
    name: 'TrustSwap Token',
    decimals: 18,
    address: TSWP_ADDRESS,
    logoURI: '',
  },

  // 👉 Add your token here:
  {
    symbol: 'MYT',
    name: 'MyToken',
    decimals: 18,
    address: '0xYourErc20AddressHere' as Address,
    logoURI: 'https://…/mytoken.png', // optional
  },
]

```

**Rules:**

-   Use a **checksummed** address (EIP-55).
    
-   **Correct `decimals`** (verify on-chain).
    
-   Short `symbol` (≤ 10 chars), clear `name`.
    
-   `logoURI` optional (HTTPS). You can also submit a logo to `front/public/logos/` and reference it.
    

### 3) ⚠️ Important: Listing in UI does **not** create liquidity

Adding a token to `TOKENS` only makes it **selectable** in the app.  
To **swap** this token with another, there **must be a Uniswap V2 pair with liquidity**.

-   If a **direct pair** exists (e.g., `MYT/WTTRUST`) **and has liquidity**, swaps will work.
    
-   If not, you must **create the pair and seed liquidity**:
    
    1.  Go to **Add Liquidity** in the app (or call Factory + Router directly).
        
    2.  Select your token and the counter-token (e.g., `WTTRUST`).
        
    3.  Provide both assets at the current price ratio and **Supply**.
        
    4.  Once liquidity exists, quotes (`getAmountsOut`) and swaps will work.
        
-   You can also allow routing via a common intermediate (e.g., `MYT → WTTRUST → TSWP`) by ensuring those pairs have liquidity.
    

### 4) Local checks

```bash
pnpm -w -C front typecheck
pnpm -w -C front build

```

### 5) Open the PR

Include:

-   Contract address (explorer link)
    
-   `decimals`, `symbol`, `name`
    
-   If possible: verified contract on explorer, and notes about special behaviors (fee-on-transfer, blacklist, pausable, etc.)
    

### 6) Review criteria (summary)

We approve if:

-   ERC-20 standard (at least `decimals`, `symbol`, `balanceOf`, `allowance`, `transferFrom`).
    
-   No obvious malicious patterns (honeypot, arbitrary blacklists, unlimited mint without governance, etc.).
    
-   No known incompatibilities with Uniswap V2 (fee-on-transfer tokens may need “SupportingFeeOnTransfer” swap routes; listing is still fine).
    

----------

## UI notes

-   **TokenSelector** also supports **import by address** (stored in localStorage).  
    Tokens in `intuit.ts` are “referenced” and shown by default.
    
-   **PoolsList** auto-discovers pairs from the **Factory**.  
    Use `HIDE_TOKENS` in `config/protocol.ts` to hide old test pairs by token address.
    

----------

## Admin (protocol fees)

-   Uniswap V2 “protocol fees” (LP fee mint 0.05% when `feeTo` is set) are controlled on **Factory** by **`feeToSetter`**:
    
    -   `feeToSetter` may call `factory.setFeeTo(<treasury>)` (enable) or `factory.setFeeTo(0x0)` (disable).
        
    -   Scripts: `contracts/scripts/20_set_fee_to.ts` & `21_unset_fee_to.ts`.
        

----------

## Deployments

Active deployment addresses are centralized in `front/src/config/protocol.ts`.  
Update them there if you redeploy Factory/Router/WNATIVE/TSWP.

----------

## Troubleshooting

-   **No quote (getAmountsOut revert)**: pair missing / zero liquidity / wrong path. Check `Factory.getPair()` and addresses.
    
-   **“Invalid opcode” on `readContract`**: ensure the address is an **ERC-20 contract**, not an EOA or unrelated contract.
    
-   **Swap blocked by “approve first”**: approve the input token with the **Approve** button.
    

----------

## License

MIT (or your preferred license).
