// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TSWP is ERC20, ERC20Permit, Ownable {
    constructor(address premintTo)
        ERC20("TrustSwap Token", "TSWP")
        ERC20Permit("TrustSwap Token")
        Ownable(msg.sender) 
    {
        _mint(premintTo, 21_000_000 ether);
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
