# Uniswap V2 fork sur Intuition Testnet

Monorepo (pnpm workspaces) : Hardhat + Frontend (Vite/React + viem). Inspiré du challenge **DEX** de speedrunethereum.

## Pré‑requis
- Node 20.x (recommandé)
- pnpm >= 9
- Un wallet avec des fonds testnet sur Intuition (voir faucet/portal si dispo)

## Récupérer le `CHAIN_ID`
Comme la chaîne n'est pas encore référencée publiquement, interroge l'RPC pour obtenir le Chain ID :

```bash
curl -s -X POST   -H "Content-Type: application/json"   --data '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}'   https://testnet.rpc.intuition.systems/http
```
Tu obtiendras une réponse du type `{ "result": "0xNNN" }`. Convertis l'hex en décimal et mets la valeur dans `.env` (ex: `CHAIN_ID=12345`).

## Installation
```bash
pnpm i
```

## Déploiement des contrats
1. Crée `contracts/.env` (copie `.env.example`) et renseigne :
   - `RPC_URL=https://testnet.rpc.intuition.systems/http`
   - `PRIVATE_KEY=0x...` (clé du déployeur)
   - `CHAIN_ID=...` (décimal)
2. Compile & déploie
```bash
pnpm -C contracts hardhat compile
pnpm -C contracts hardhat run scripts/00_deploy_core.ts --network intuition
```
➜ Les adresses sont écrites dans `contracts/deployments/intuition.json`.

3. (Optionnel) Seed de liquidité sur les 2 tokens de test
```bash
pnpm -C contracts hardhat run scripts/01_seed_liquidity.ts --network intuition
```

## Lancer le frontend
1. Crée `frontend/.env` d'après `.env.example` et colle les adresses déployées:
```env
VITE_RPC_URL=https://testnet.rpc.intuition.systems/http
VITE_CHAIN_ID=...        # décimal
VITE_FACTORY_ADDRESS=0x...
VITE_ROUTER_ADDRESS=0x...
VITE_WTTRUST_ADDRESS=0x...
```
2. Démarre l'app :
```bash
pnpm -C frontend dev
```

## Notes
- Le front définit une chaîne custom via `viem.defineChain` → pas besoin d'être listé.
- Contrats Uniswap V2 (core/periphery) + WETH9 déployés localement.
- **Testnet uniquement, non audité.**
