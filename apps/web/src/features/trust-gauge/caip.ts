import { getAddress } from "viem";


/**
* Build a CAIP-10 account identifier for a token contract address.
* If you later switch to CAIP-19, replace this function in one place.
*/
export function toCAIP10(chainId: number, tokenAddress: string) {
const checksum = getAddress(tokenAddress);
return `eip155:${chainId}:${checksum}`;
}


/**
* (Optional) CAIP-19 builder for ERC-20 tokens if you decide to use it in the future.
*/
export function toCAIP19(chainId: number, tokenAddress: string) {
const checksum = getAddress(tokenAddress);
return `eip155:${chainId}/erc20:${checksum}`;
}